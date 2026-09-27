import { execFile } from "node:child_process"
import { randomUUID } from "node:crypto"
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { saveSubscriptionRequest } from "../subscription-requests"

function isLocalDatabase() {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL ?? "").hostname)
  } catch {
    return false
  }
}

const integration = describe.skipIf(process.env.CI !== "true" || !isLocalDatabase())

function command(script: string, args: string[], operator = "support-rehearsal") {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    execFile("pnpm", [script, ...args], {
      cwd: process.cwd(), env: { ...process.env, BILLING_OPERATOR: operator }, timeout: 20000,
    }, (error, stdout, stderr) => {
      let code = 0
      if (error) {
        if (typeof error.code !== "number") return reject(error)
        code = error.code
      }
      resolve({ code, stdout, stderr })
    })
  })
}

function output(stdout: string) {
  const line = stdout.split("\n").find(value => value.startsWith("{"))
  if (!line) throw new Error(`CLI did not return JSON: ${stdout}`)
  return JSON.parse(line) as {
    status: string; activationRecorded: boolean; activationMatchesRequest: boolean;
    completedBy: string; subscriptionId: string; subscription: { id: string } | null;
  }
}

integration("support activation through actual pnpm commands (local PostgreSQL only)", () => {
  let businessId = ""
  let cardId = ""
  let ticket = ""

  beforeEach(async () => {
    const business = await prisma.business.create({ data: { name: "Support rehearsal", email: `support-${randomUUID()}@dev.invalid` } })
    businessId = business.id
    const user = await prisma.user.create({ data: { name: "Support owner", email: business.email, businessId, authUserId: randomUUID(), role: "admin" } })
    const card = await prisma.loyaltyCard.create({ data: { businessId, name: "Support draft", reward: "Coffee", status: "DRAFT", isActive: false } })
    cardId = card.id
    await prisma.onboardingProgress.create({ data: { userId: user.id, businessId, firstCardId: cardId, step: "PAYWALL", status: "AWAITING_PAYMENT" } })
    const saved = await saveSubscriptionRequest(prisma, { businessId, requestedByUserId: user.id, plan: "LITE", billingInterval: "ANNUAL" })
    ticket = saved.request.ticketNumber
  })

  afterEach(async () => {
    if (businessId) await prisma.business.delete({ where: { id: businessId } })
    businessId = ""
  })
  afterAll(async () => prisma.$disconnect())

  const activation = (key = `ticket:${ticket}`) => command("billing:set-plan", [
    "--business-id", businessId, "--plan", "LITE", "--interval", "ANNUAL", "--idempotency-key", key,
  ])

  it("resumes after activation without duplicating the subscription, period, audit or completion", async () => {
    const initial = await command("billing:ticket", ["--", "show", ticket])
    expect(initial.code).toBe(0)
    expect(output(initial.stdout)).toMatchObject({ status: "PENDING", subscription: null, activationRecorded: false, activationMatchesRequest: false })

    const activated = await activation()
    expect(activated.code).toBe(0)
    const firstSubscription = await prisma.subscription.findUniqueOrThrow({ where: { id: output(activated.stdout).subscriptionId } })
    // The operator loses the terminal here, before completing the ticket.
    const interrupted = await command("billing:ticket", ["show", ticket])
    expect(interrupted.code).toBe(0)
    expect(output(interrupted.stdout)).toMatchObject({ status: "PENDING", activationRecorded: true, activationMatchesRequest: true })
    expect((await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: cardId } })).status).toBe("ACTIVE")
    expect(await prisma.onboardingProgress.findFirst({ where: { businessId } })).toMatchObject({ status: "ACTIVE" })
    expect(firstSubscription).toMatchObject({ plan: "LITE", billingInterval: "ANNUAL", proAccessGranted: true })
    expect(firstSubscription.proTrialEndsAt).not.toBeNull()

    const retried = await activation()
    expect(retried.code).toBe(0)
    expect(output(retried.stdout).subscriptionId).toBe(firstSubscription.id)
    expect(await prisma.subscription.findUnique({ where: { id: firstSubscription.id } })).toEqual(firstSubscription)
    expect(await prisma.subscription.count({ where: { businessId } })).toBe(1)
    expect(await prisma.billingAuditEvent.count({ where: { businessId } })).toBe(1)

    const completed = await command("billing:ticket", ["--", "complete", ticket])
    expect(completed.code).toBe(0)
    expect(output(completed.stdout)).toMatchObject({ status: "COMPLETED", completedBy: "support-rehearsal" })
    const repeated = await command("billing:ticket", ["complete", ticket], "other-operator")
    expect(repeated.code).toBe(0)
    expect(output(repeated.stdout).completedBy).toBe("support-rehearsal")
  }, 30000)

  it("rejects premature completion, missing operator, malformed arguments, unknown folio and the wrong activation key", async () => {
    expect((await command("billing:ticket", ["--", "complete", ticket])).code).toBe(1)
    expect((await command("billing:ticket", ["--", "complete", ticket], "")).code).toBe(1)
    expect((await command("billing:ticket", ["--", "show", ticket, "extra"])).code).toBe(2)
    expect((await command("billing:ticket", ["--", "show", "KF-0000000000000000"])).code).toBe(1)
    expect(await prisma.subscription.count({ where: { businessId } })).toBe(0)
    expect((await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: cardId } })).status).toBe("DRAFT")

    expect((await activation(`wrong:${ticket}`)).code).toBe(0)
    const wrongKey = await command("billing:ticket", ["--", "show", ticket])
    expect(wrongKey.code).toBe(0)
    expect(output(wrongKey.stdout)).toMatchObject({ status: "PENDING", activationRecorded: false, activationMatchesRequest: false })
    expect((await command("billing:ticket", ["--", "complete", ticket])).code).toBe(1)
    expect(await prisma.subscriptionRequest.findUnique({ where: { ticketNumber: ticket } })).toMatchObject({ status: "PENDING", completedAt: null })
  }, 30000)
})
