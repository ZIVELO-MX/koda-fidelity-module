import { randomUUID } from "node:crypto"
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { ConflictError } from "@/lib/api-utils"
import { activateManualSubscription } from "../account-lifecycle"
import { completeSubscriptionRequest, getLatestSubscriptionRequest, getSubscriptionRequestByTicket, saveSubscriptionRequest } from "../subscription-requests"

const integration = describe.skipIf(process.env.CI !== "true")

integration("manual activation requests PostgreSQL integration", () => {
  let businessId = ""
  let otherBusinessId = ""
  let userId = ""
  let cardId = ""

  beforeEach(async () => {
    const business = await prisma.business.create({ data: { name: "Ticket Test", email: `ticket-${randomUUID()}@test.invalid` } })
    const other = await prisma.business.create({ data: { name: "Other Business", email: `other-${randomUUID()}@test.invalid` } })
    const user = await prisma.user.create({ data: { name: "Ticket Owner", email: business.email, businessId: business.id, authUserId: randomUUID() } })
    const card = await prisma.loyaltyCard.create({ data: { businessId: business.id, name: "Draft card", reward: "Coffee", status: "DRAFT", isActive: false } })
    businessId = business.id
    otherBusinessId = other.id
    userId = user.id
    cardId = card.id
  })

  afterEach(async () => {
    if (businessId) await prisma.business.delete({ where: { id: businessId } })
    if (otherBusinessId) await prisma.business.delete({ where: { id: otherBusinessId } })
    businessId = ""
    otherBusinessId = ""
    userId = ""
    cardId = ""
  })
  afterAll(async () => { await prisma.$disconnect() })

  it("persists one ticket, reuses it after retry or plan change, and never activates the account", async () => {
    const input = { businessId, requestedByUserId: userId, plan: "LITE" as const, billingInterval: "MONTHLY" as const }
    const first = await saveSubscriptionRequest(prisma, input)
    const retry = await saveSubscriptionRequest(prisma, input)
    const changed = await saveSubscriptionRequest(prisma, { ...input, plan: "PRO", billingInterval: "ANNUAL" })

    expect(first.created).toBe(true)
    expect(first.request.ticketNumber).toMatch(/^KF-[0-9A-F]{16}$/)
    expect(retry).toMatchObject({ created: false, request: { ticketNumber: first.request.ticketNumber } })
    expect(changed).toMatchObject({ created: false, request: { ticketNumber: first.request.ticketNumber, plan: "PRO", billingInterval: "ANNUAL" } })
    expect(await prisma.subscriptionRequest.count({ where: { businessId, status: "PENDING" } })).toBe(1)
    expect(await getLatestSubscriptionRequest(prisma, otherBusinessId)).toBeNull()
    expect((await getLatestSubscriptionRequest(prisma, businessId))?.requestedByUser.email).toBe((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).email)
    expect(await prisma.subscription.count({ where: { businessId } })).toBe(0)
    expect(await prisma.billingAuditEvent.count({ where: { businessId } })).toBe(0)
    expect(await prisma.loyaltyCard.findUnique({ where: { id: cardId }, select: { status: true, isActive: true } })).toEqual({ status: "DRAFT", isActive: false })
  })

  it("serializes concurrent creates using the unique pending-business constraint", async () => {
    const input = { businessId, requestedByUserId: userId, plan: "LITE" as const, billingInterval: "ANNUAL" as const }
    const results = await Promise.all(Array.from({ length: 3 }, () => saveSubscriptionRequest(prisma, input)))
    expect(new Set(results.map(({ request }) => request.ticketNumber)).size).toBe(1)
    expect(await prisma.subscriptionRequest.count({ where: { businessId, status: "PENDING" } })).toBe(1)
  })

  it("lets support complete only after the matching manual activation", async () => {
    const saved = await saveSubscriptionRequest(prisma, { businessId, requestedByUserId: userId, plan: "LITE", billingInterval: "ANNUAL" })
    await expect(completeSubscriptionRequest(prisma, saved.request.ticketNumber, "operator-1")).rejects.toBeInstanceOf(ConflictError)
    expect((await getSubscriptionRequestByTicket(prisma, saved.request.ticketNumber))?.status).toBe("PENDING")

    await activateManualSubscription(prisma, { businessId, plan: "LITE", billingInterval: "ANNUAL", idempotencyKey: randomUUID() })
    await expect(completeSubscriptionRequest(prisma, saved.request.ticketNumber, "operator-1")).rejects.toBeInstanceOf(ConflictError)
    await activateManualSubscription(prisma, { businessId, plan: "LITE", billingInterval: "ANNUAL", idempotencyKey: `ticket:${saved.request.ticketNumber}` })
    await expect(saveSubscriptionRequest(prisma, { businessId, requestedByUserId: userId, plan: "PRO", billingInterval: "MONTHLY" })).rejects.toBeInstanceOf(ConflictError)
    const completed = await completeSubscriptionRequest(prisma, saved.request.ticketNumber, "operator-1")
    expect(completed).toMatchObject({ status: "COMPLETED", completedBy: "operator-1" })
    expect(completed.completedAt).toBeInstanceOf(Date)
    expect((await completeSubscriptionRequest(prisma, saved.request.ticketNumber, "operator-2")).completedBy).toBe("operator-1")
  })
})
