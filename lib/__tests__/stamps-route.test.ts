import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockGetUser, mockPrisma } = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockPrisma = {
    user: { findUnique: vi.fn() },
    customer: { findUnique: vi.fn(), update: vi.fn() },
  }
  return { mockGetUser, mockPrisma }
})

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}))

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

vi.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}))

import { POST } from "@/app/api/stamps/route"

function makeRequest(body: unknown) {
  return { json: async () => body } as never
}

const sessionUser = { email: "owner@biz.test" }
const dbUser = {
  id: "u1",
  email: "owner@biz.test",
  name: "Owner",
  role: "admin" as const,
  business: {
    id: "biz1",
    name: "Biz",
    email: "owner@biz.test",
    brandColor: "#f97316",
    logoUrl: null,
    iconName: null,
    nickname: null,
    businessType: null,
    address: null,
    phone: null,
    website: null,
    instagram: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

function makeCustomer(overrides: Partial<{
  stamps: number
  businessId: string
  stampsRequired: number
  expiresAt: Date | null
  isActive: boolean
}> = {}) {
  const { stamps = 3, businessId = "biz1", stampsRequired = 10, expiresAt = null, isActive = true } = overrides
  return {
    id: "cust1",
    name: "Ana",
    stamps,
    isActive,
    card: { id: "card1", businessId, stampsRequired, reward: "Café gratis", expiresAt, milestoneRewards: [] },
  }
}

const updatedCustomer = {
  id: "cust1",
  name: "Ana",
  stamps: 4,
  card: { name: "Tarjeta", stampsRequired: 10, reward: "Café gratis" },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: sessionUser }, error: null })
  mockPrisma.user.findUnique.mockResolvedValue(dbUser)
})

describe("POST /api/stamps", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(makeRequest({ customerId: "cust1" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when customerId is missing", async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Customer ID is required")
  })

  it("returns 404 when customer does not exist", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue(null)
    const res = await POST(makeRequest({ customerId: "cust1" }))
    expect(res.status).toBe(404)
  })

  it("returns 404 on cross-tenant access (IDOR guard)", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue(makeCustomer({ businessId: "other-biz" }))
    const res = await POST(makeRequest({ customerId: "cust1" }))
    expect(res.status).toBe(404)
  })

  it("returns 404 when customer is inactive (soft-deleted)", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue(makeCustomer({ isActive: false }))
    const res = await POST(makeRequest({ customerId: "cust1" }))
    expect(res.status).toBe(404)
  })

  it("returns 400 when card is expired", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue(makeCustomer({ expiresAt: new Date("2020-01-01") }))
    const res = await POST(makeRequest({ customerId: "cust1" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("expired")
  })

  describe("stamp operation", () => {
    it("returns 200 and calls update with increment on happy path", async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(makeCustomer({ stamps: 3 }))
      mockPrisma.customer.update.mockResolvedValue(updatedCustomer)
      const res = await POST(makeRequest({ customerId: "cust1", type: "stamp" }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.event).toBe("stamp")
      expect(mockPrisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "cust1", stamps: { lt: 10 } }),
          data: expect.objectContaining({ stamps: { increment: 1 } }),
        }),
      )
    })

    it("returns 400 and does NOT call update when card is full", async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(makeCustomer({ stamps: 10, stampsRequired: 10 }))
      const res = await POST(makeRequest({ customerId: "cust1", type: "stamp" }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain("must redeem first")
      expect(mockPrisma.customer.update).not.toHaveBeenCalled()
    })

    it("defaults to stamp when type is unknown", async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(makeCustomer({ stamps: 3 }))
      mockPrisma.customer.update.mockResolvedValue(updatedCustomer)
      const res = await POST(makeRequest({ customerId: "cust1", type: "banana" }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.event).toBe("stamp")
    })
  })

  describe("redeem operation", () => {
    it("returns 200 and calls update with stamps:0 on happy path", async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(makeCustomer({ stamps: 10, stampsRequired: 10 }))
      mockPrisma.customer.update.mockResolvedValue({ ...updatedCustomer, stamps: 0 })
      const res = await POST(makeRequest({ customerId: "cust1", type: "redeem" }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.event).toBe("redeem")
      expect(mockPrisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "cust1", stamps: { gte: 10 } }),
          data: expect.objectContaining({ stamps: 0 }),
        }),
      )
    })

    it("returns 400 and does NOT call update when stamps are insufficient", async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(makeCustomer({ stamps: 3, stampsRequired: 10 }))
      const res = await POST(makeRequest({ customerId: "cust1", type: "redeem" }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain("more stamps to redeem")
      expect(mockPrisma.customer.update).not.toHaveBeenCalled()
    })
  })
})
