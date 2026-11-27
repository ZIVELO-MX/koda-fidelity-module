import { afterAll, afterEach, describe, expect, it, vi } from "vitest"
import { prisma } from "@/lib/prisma"

const { getBusinessFromSession } = vi.hoisted(() => ({ getBusinessFromSession: vi.fn() }))
vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return { ...actual, getBusinessFromSession }
})

import { GET } from "./route"

const integration = describe.skipIf(process.env.CI !== "true")

integration("GET /api/customers C1 contract", () => {
  const businessIds: string[] = []

  afterEach(async () => { await Promise.all(businessIds.splice(0).map(id => prisma.business.delete({ where: { id } })) ) })
  afterAll(async () => prisma.$disconnect())

  it("returns paginated items and a genuine empty page", async () => {
    const business = await prisma.business.create({ data: { name: "Customer API", email: `customer-api-${Date.now()}@test.invalid` } })
    businessIds.push(business.id)
    const card = await prisma.loyaltyCard.create({ data: { businessId: business.id, name: "Card", reward: "Coffee" } })
    await prisma.customer.create({ data: { cardId: card.id, name: "Visible Customer" } })
    getBusinessFromSession.mockResolvedValue({ business, user: { id: "u", email: business.email, name: "Admin", role: "admin", passwordSetupRequired: false } })

    const page = await GET(new Request("http://localhost/api/customers?page=1&limit=1") as never)
    expect(page.status).toBe(200)
    expect(await page.json()).toMatchObject({ page: 1, pageSize: 1, total: 1, items: [{ name: "Visible Customer" }] })
    const empty = await GET(new Request("http://localhost/api/customers?q=does-not-exist") as never)
    expect(await empty.json()).toMatchObject({ items: [], total: 0 })
  })

  it("keeps customer search scoped to the business of an authenticated sellador", async () => {
    const businesses = await Promise.all(["own", "other"].map(label =>
      prisma.business.create({ data: { name: label, email: `customer-scope-${label}-${crypto.randomUUID()}@test.invalid` } }),
    ))
    businessIds.push(...businesses.map(business => business.id))
    const [ownCard, otherCard] = await Promise.all(businesses.map(business =>
      prisma.loyaltyCard.create({ data: { businessId: business.id, name: "Card", reward: "Coffee" } }),
    ))
    await prisma.customer.createMany({ data: [
      { cardId: ownCard.id, name: "Cliente de prueba", stamps: 10 },
      { cardId: otherCard.id, name: "Cliente de prueba", stamps: 10 },
    ] })
    const [business] = businesses
    getBusinessFromSession.mockResolvedValue({ business, user: { id: "u", email: business.email, name: "Sellador", role: "sellador", passwordSetupRequired: false } })

    const search = await GET(new Request("http://localhost/api/customers?q=prueba&readyToRedeem=true") as never)
    expect(search.status).toBe(200)
    expect(await search.json()).toMatchObject({ total: 1, items: [{ cardId: ownCard.id }] })
  })

  it("returns a contract error for invalid pagination", async () => {
    const business = await prisma.business.create({ data: { name: "Customer API Invalid", email: `customer-api-invalid-${Date.now()}@test.invalid` } })
    businessIds.push(business.id)
    getBusinessFromSession.mockResolvedValue({ business, user: { id: "u", email: business.email, name: "Admin", role: "admin", passwordSetupRequired: false } })
    const response = await GET(new Request("http://localhost/api/customers?page=0") as never)
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "KF-REQUEST-001" })
  })
})
