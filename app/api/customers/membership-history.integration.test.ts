import { randomUUID } from "node:crypto"
import { NextRequest } from "next/server"
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { prisma } from "@/lib/prisma"
import { executeLoyaltyOperation } from "@/lib/loyalty-engine"

const { getBusiness, getUser } = vi.hoisted(() => ({ getBusiness: vi.fn(), getUser: vi.fn() }))
vi.mock("@/lib/api-utils", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/api-utils")>(),
  requireWritableBusinessPrincipal: getBusiness,
}))
vi.mock("@/lib/supabase-server", () => ({ createClient: async () => ({ auth: { getUser } }) }))

import { DELETE as deactivate, PATCH as correct } from "./[id]/route"
import { DELETE as hide } from "../my-cards/[customerId]/route"
import { GET as list } from "../join/route"

describe.skipIf(process.env.CI !== "true")("membership history in PostgreSQL", () => {
  let businessId: string
  let cardId: string
  let customerId: string
  const original = "original@example.com"
  const corrected = "correct_ed@example.com"

  beforeEach(async () => {
    const business = await prisma.business.create({ data: { name: "Test", email: `${randomUUID()}@test.invalid` } })
    businessId = business.id
    getBusiness.mockResolvedValue({ business, user: { role: "admin" } })
    const card = await prisma.loyaltyCard.create({ data: {
      businessId, name: "Card", reward: "Coffee", stampsRequired: 2,
      milestoneRewards: { create: { stampNumber: 1, label: "Prize", probability: 100 } },
    } })
    cardId = card.id
    customerId = (await prisma.customer.create({ data: { cardId, name: "Member", email: original } })).id
    for (const type of ["stamp", "stamp", "redeem", "stamp"] as const) {
      await executeLoyaltyOperation(prisma, { customerId, businessId, type, idempotencyKey: randomUUID() })
    }
  })

  afterEach(async () => {
    if (businessId) await prisma.business.delete({ where: { id: businessId } })
  })
  afterAll(() => prisma.$disconnect())

  function signIn(email: string) {
    getUser.mockResolvedValue({ data: { user: { email, email_confirmed_at: "2026-01-01" } }, error: null })
  }

  function lookup(email: string) {
    return list(new NextRequest(`http://localhost/api/join?email=${encodeURIComponent(email)}`))
  }

  async function expectHistory() {
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      include: { _count: { select: { cycles: true, operations: true, milestoneClaims: true } } },
    })
    expect(customer.stamps).toBe(1)
    expect(customer._count).toMatchObject({ operations: 4, milestoneClaims: 2 })
    expect(customer._count.cycles).toBeGreaterThan(0)
    return customer
  }

  it("rejects permanent removal and preserves history during normal deactivation", async () => {
    const context = { params: Promise.resolve({ id: customerId }) }
    const url = `http://localhost/api/customers/${customerId}`
    expect((await deactivate(new NextRequest(`${url}?permanent=true`), context)).status).toBe(400)
    expect((await expectHistory()).isActive).toBe(true)
    expect((await deactivate(new NextRequest(url), context)).status).toBe(200)
    expect((await expectHistory()).isActive).toBe(false)
  })

  it("hides expired cards only for the owner and shows a reactivated card again", async () => {
    const request = new NextRequest(`http://localhost/api/my-cards/${customerId}`)
    const context = { params: Promise.resolve({ customerId }) }
    signIn(original)
    expect((await hide(request, context)).status).toBe(400)
    await prisma.loyaltyCard.update({ where: { id: cardId }, data: { expiresAt: new Date("2020-01-01T00:00:00Z") } })
    signIn("another@example.com")
    expect((await hide(request, context)).status).toBe(404)
    signIn(original)
    expect((await hide(request, context)).status).toBe(200)
    expect((await hide(request, context)).status).toBe(200)
    expect(await (await lookup(original)).json()).toEqual({ customers: [] })
    expect((await expectHistory()).isActive).toBe(true)
    await prisma.loyaltyCard.update({ where: { id: cardId }, data: { expiresAt: null } })
    expect(await (await lookup(original)).json()).toMatchObject({ customers: [{ id: customerId, stamps: 1 }] })
  })

  it("rejects a duplicate and corrects the email on the same membership", async () => {
    await prisma.customer.createMany({ data: [
      { cardId, name: "Existing", email: "in-use@example.com" },
      { cardId, name: "Similar", email: "correctxed@example.com" },
    ] })
    const context = { params: Promise.resolve({ id: customerId }) }
    const request = (email: string) => new NextRequest(`http://localhost/api/customers/${customerId}`, {
      method: "PATCH",
      body: JSON.stringify({ email }),
    })
    expect((await correct(request(" IN-USE@example.com "), context)).status).toBe(409)
    expect((await expectHistory()).email).toBe(original)
    expect((await correct(request(" Correct_ed@Example.com "), context)).status).toBe(200)
    expect((await expectHistory()).email).toBe(corrected)
    signIn(original)
    expect(await (await lookup(original)).json()).toEqual({ customers: [] })
    signIn(corrected)
    expect(await (await lookup(corrected)).json()).toMatchObject({ customers: [{ id: customerId, stamps: 1 }] })
  })
})
