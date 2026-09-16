import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { executeLoyaltyOperation } from "@/lib/loyalty-engine"

// CI provides an isolated PostgreSQL service. Never run these destructive fixtures against .env.
const integration = describe.skipIf(process.env.CI !== "true")

integration("loyalty engine PostgreSQL integration", () => {
  let businessId = ""
  let customerId = ""

  beforeEach(async () => {
    const business = await prisma.business.create({ data: { name: "Integration Test", email: `loyalty-${Date.now()}@test.invalid` } })
    const card = await prisma.loyaltyCard.create({
      data: {
        businessId: business.id,
        name: "Integration Card",
        reward: "Coffee",
        stampsRequired: 2,
        milestoneRewards: { create: [{ stampNumber: 1, label: "Bonus", probability: 0 }] },
      },
    })
    const customer = await prisma.customer.create({ data: { name: "Integration Customer", cardId: card.id } })
    businessId = business.id
    customerId = customer.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  afterEach(async () => {
    if (businessId) await prisma.business.delete({ where: { id: businessId } })
    businessId = ""
    customerId = ""
  })

  it("commits stamp, no-prize audit and operation atomically", async () => {
    const result = await executeLoyaltyOperation(prisma, { businessId, customerId, type: "stamp", idempotencyKey: "integration-1" })
    const logs = await prisma.stampLog.findMany({ where: { customerId }, orderBy: { createdAt: "asc" } })
    expect(result.event).toBe("stamp")
    expect(logs.map(log => log.type)).toEqual(["stamp", "milestone"])
    expect(logs[1].metadata).toMatchObject({ outcome: "no_prize", randomRoll: expect.any(Number) })
  })

  it("returns the same response and does not duplicate a retry", async () => {
    const first = await executeLoyaltyOperation(prisma, { businessId, customerId, type: "stamp", idempotencyKey: "integration-retry" })
    const second = await executeLoyaltyOperation(prisma, { businessId, customerId, type: "stamp", idempotencyKey: "integration-retry" })
    expect(second).toEqual(first)
    expect(await prisma.loyaltyOperation.count({ where: { customerId } })).toBe(1)
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).stamps).toBe(1)
  })

  it("serializes concurrent stamps without exceeding the cycle balance", async () => {
    await Promise.all([
      executeLoyaltyOperation(prisma, { businessId, customerId, type: "stamp", idempotencyKey: "concurrent-a" }),
      executeLoyaltyOperation(prisma, { businessId, customerId, type: "stamp", idempotencyKey: "concurrent-b" }),
    ])
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).stamps).toBe(2)
    expect(await prisma.stampLog.count({ where: { customerId, type: "stamp" } })).toBe(2)
  })
})
