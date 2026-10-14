import { afterAll, afterEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { executeLoyaltyOperation } from "@/lib/loyalty-engine"

const integration = describe.skipIf(process.env.CI !== "true")

integration("FID-C1 loyalty and tenant boundaries", () => {
  const businessIds: string[] = []

  afterEach(async () => {
    await Promise.all(businessIds.splice(0).map((id) => prisma.business.delete({ where: { id } })))
  })
  afterAll(async () => prisma.$disconnect())

  it("stamps and redeems with idempotent retries", async () => {
    const business = await prisma.business.create({ data: { name: "FID0021 Loyalty", email: `fid0021-${Date.now()}@test.invalid` } })
    businessIds.push(business.id)
    const card = await prisma.loyaltyCard.create({ data: { businessId: business.id, name: "Integration", reward: "Coffee", stampsRequired: 1 } })
    const customer = await prisma.customer.create({ data: { cardId: card.id, name: "Integration Customer" } })

    const stamped = await executeLoyaltyOperation(prisma, { businessId: business.id, customerId: customer.id, type: "stamp", idempotencyKey: "fid0021-stamp" })
    expect(stamped.event).toBe("stamp")
    expect(await executeLoyaltyOperation(prisma, { businessId: business.id, customerId: customer.id, type: "stamp", idempotencyKey: "fid0021-stamp" })).toEqual(stamped)
    const redeemed = await executeLoyaltyOperation(prisma, { businessId: business.id, customerId: customer.id, type: "redeem", idempotencyKey: "fid0021-redeem" })
    expect(redeemed.event).toBe("redeem")
    expect(await prisma.loyaltyOperation.count({ where: { customerId: customer.id } })).toBe(2)
  })

  it("does not expose one business customer through another business scope", async () => {
    const [first, second] = await Promise.all([
      prisma.business.create({ data: { name: "FID0021 A", email: `fid0021-a-${Date.now()}@test.invalid` } }),
      prisma.business.create({ data: { name: "FID0021 B", email: `fid0021-b-${Date.now()}@test.invalid` } }),
    ])
    businessIds.push(first.id, second.id)
    const card = await prisma.loyaltyCard.create({ data: { businessId: first.id, name: "Scoped", reward: "Coffee" } })
    const customer = await prisma.customer.create({ data: { cardId: card.id, name: "Private Customer" } })
    const scoped = await prisma.customer.findMany({ where: { card: { businessId: second.id } } })
    expect(scoped).toEqual([])
    expect((await prisma.customer.findMany({ where: { card: { businessId: first.id } } })).map(({ id }) => id)).toEqual([customer.id])
  })
})
