import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    loyaltyCard: { findUnique: vi.fn() },
    customer: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    stampLog: { create: vi.fn() },
    $transaction: vi.fn(),
    user: { findUnique: vi.fn() },
  }
  return { mockPrisma }
})

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  })),
}))

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

vi.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}))

import { POST } from "@/app/api/join/route"

function makeRequest(body: unknown) {
  return { json: async () => body } as never
}

const validCard = { id: "card1", businessId: "business1", expiresAt: null, isActive: true }

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.loyaltyCard.findUnique.mockResolvedValue(validCard)
  mockPrisma.customer.findFirst.mockResolvedValue(null)
  mockPrisma.customer.create.mockResolvedValue({ id: "cust1" })
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma))
})

describe("POST /api/join", () => {
  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest({ email: "a@b.com", cardId: "card1" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Name is required")
  })

  it("returns 400 when name is blank", async () => {
    const res = await POST(makeRequest({ name: "   ", email: "a@b.com", cardId: "card1" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when email lacks @", async () => {
    const res = await POST(makeRequest({ name: "Ana", email: "invalidemail", cardId: "card1" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Invalid email")
  })

  it("returns 400 when cardId is missing", async () => {
    const res = await POST(makeRequest({ name: "Ana", email: "a@b.com" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Invalid card ID")
  })

  it("returns 404 when card does not exist", async () => {
    mockPrisma.loyaltyCard.findUnique.mockResolvedValue(null)
    const res = await POST(makeRequest({ name: "Ana", email: "a@b.com", cardId: "card1" }))
    expect(res.status).toBe(404)
  })

  it("returns 400 when card is expired", async () => {
    mockPrisma.loyaltyCard.findUnique.mockResolvedValue({ id: "card1", expiresAt: new Date("2020-01-01"), isActive: true })
    const res = await POST(makeRequest({ name: "Ana", email: "a@b.com", cardId: "card1" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("expired")
  })

  it("returns existing:true and does NOT call create when customer already joined", async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({ id: "existing1" })
    const res = await POST(makeRequest({ name: "Ana", email: "a@b.com", cardId: "card1" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.existing).toBe(true)
    expect(mockPrisma.customer.create).not.toHaveBeenCalled()
  })

  it("creates customer with trimmed name on happy path", async () => {
    const res = await POST(makeRequest({ name: "  Ana  ", email: "a@b.com", cardId: "card1" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.existing).toBe(false)
    expect(body.customerId).toBe("cust1")
    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Ana", email: "a@b.com", cardId: "card1" }),
      }),
    )
  })
})
