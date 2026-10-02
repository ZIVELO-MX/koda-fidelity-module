import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    loyaltyCard: { findUnique: vi.fn() },
    customer: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
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
vi.mock("@/lib/account-lifecycle", () => ({
  assertBusinessWritable: vi.fn(),
  syncExpiredEntitlements: vi.fn(),
}))

vi.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}))

import { GET, POST } from "@/app/api/join/route"
import { createClient } from "@/lib/supabase-server"

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

  // El teclado del celular escribe «Ana@…» y Supabase guarda «ana@…». Al volver
  // del enlace mágico la página repite el alta: tiene que encontrar la primera.
  it("guarda el correo en minúsculas y busca sin distinguir mayúsculas", async () => {
    await POST(makeRequest({ name: "Ana", email: "  Ana@Gmail.COM ", cardId: "card1" }))
    expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: "ana@gmail.com", mode: "insensitive" }, cardId: "card1" },
    })
    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "ana@gmail.com" }) }),
    )
  })
})

describe("GET /api/join?email=", () => {
  it("encuentra las tarjetas aunque el correo se haya guardado con mayúsculas", async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email: "ana@gmail.com" } } }) },
    } as never)
    mockPrisma.customer.findMany.mockResolvedValue([])
    const res = await GET({ url: "http://x/api/join?email=Ana%40Gmail.com" } as never)
    expect(res.status).toBe(200)
    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: { equals: "ana@gmail.com", mode: "insensitive" } } }),
    )
  })
})
