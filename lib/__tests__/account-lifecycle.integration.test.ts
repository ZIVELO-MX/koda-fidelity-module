import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"
import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { ConflictError } from "@/lib/api-utils"
import { activateManualSubscription, addCalendarMonths, createCustomerProfile, getEntitlements, scheduleClosure } from "../account-lifecycle"
import { ensureCategories, getOnboarding, saveDraft } from "../onboarding-service"

const integration = describe.skipIf(process.env.CI !== "true")

integration("account lifecycle PostgreSQL integration", () => {
  let businessId = ""
  let userId = ""

  beforeEach(async () => {
    const business = await prisma.business.create({ data: { name: "Lifecycle Test", email: `lifecycle-${Date.now()}-${Math.random()}@test.invalid` } })
    const user = await prisma.user.create({ data: { name: "Lifecycle User", email: business.email, authUserId: randomUUID(), businessId: business.id } })
    businessId = business.id
    userId = user.id
    await prisma.onboardingProgress.create({ data: { userId, businessId } })
    await ensureCategories(prisma)
  })

  afterAll(async () => { await prisma.$disconnect() })
  afterEach(async () => {
    if (businessId) await prisma.business.delete({ where: { id: businessId } })
    businessId = ""
    userId = ""
  })

  it("rejects a stale draft and allows only one concurrent writer", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const input = { draftVersion: 0, business: { name: "Updated" } }
    const writes = await Promise.allSettled([saveDraft(prisma, user.authUserId!, input), saveDraft(prisma, user.authUserId!, input)])
    expect(writes.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    expect(writes.find((result) => result.status === "rejected")?.reason).toBeInstanceOf(ConflictError)
  })

  it("supports trial, explicit Lite downgrade, duplicate protection and grace period", async () => {
    const card = await prisma.loyaltyCard.createManyAndReturn({ data: [
      { businessId, name: "One", reward: "R1", isActive: false, isLite: true },
      { businessId, name: "Two", reward: "R2", isActive: false, isLite: false },
    ] })
    const trial = await activateManualSubscription(prisma, { businessId, plan: "LITE", billingInterval: "MONTHLY" })
    expect((await getEntitlements(prisma, businessId)).plan).toBe("PRO")
    expect(trial.proTrialEndsAt?.getTime()).toBe(addCalendarMonths(trial.periodStart, 1).getTime())
    await expect(createCustomerProfile(prisma, { businessId, email: "person@example.com", name: "Person", authUserId: randomUUID() })).resolves.toBeTruthy()
    await expect(createCustomerProfile(prisma, { businessId, email: "PERSON@example.com", name: "Other", authUserId: randomUUID() })).rejects.toBeInstanceOf(ConflictError)
    await activateManualSubscription(prisma, { businessId, plan: "LITE", proTrialEndsAt: null })
    expect((await prisma.loyaltyCard.findMany({ where: { businessId, isActive: true } }))).toHaveLength(1)
    const closure = await scheduleClosure(prisma, businessId, new Date("2026-01-31T00:00:00.000Z"))
    expect(closure.scheduledFor.toISOString()).toBe("2026-02-28T00:00:00.000Z")
    expect(card).toHaveLength(2)
  })

  it("creates resumable onboarding state with the exact persisted version", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const state = await getOnboarding(prisma, user.authUserId!)
    expect(state.onboardingProgress?.draftVersion).toBe(0)
    await saveDraft(prisma, user.authUserId!, { draftVersion: 0, card: { reward: "Coffee" } })
    expect((await getOnboarding(prisma, user.authUserId!)).onboardingProgress?.draftVersion).toBe(1)
  })
})
