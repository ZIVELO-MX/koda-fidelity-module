import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockGetUser, mockExecute, mockUserFind } = vi.hoisted(() => ({ mockGetUser: vi.fn(), mockExecute: vi.fn(), mockUserFind: vi.fn() }))
vi.mock("@/lib/supabase-server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })) }))
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mockUserFind } } }))
vi.mock("@/lib/loyalty-engine", () => ({ executeLoyaltyOperation: mockExecute }))
vi.mock("next/server", () => ({ NextRequest: class {}, NextResponse: { json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { status: init?.status ?? 200 }) } }))

import { POST } from "@/app/api/stamps/route"

function makeRequest(body: unknown, key = "operation-1") {
  return { json: async () => body, headers: new Headers({ "Idempotency-Key": key }) } as never
}

const sessionUser = { email: "owner@biz.test" }
const dbUser = { id: "u1", email: "owner@biz.test", name: "Owner", role: "admin" as const, business: { id: "biz1" } }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: sessionUser }, error: null })
  mockUserFind.mockResolvedValue(dbUser)
  mockExecute.mockResolvedValue({ event: "stamp", customer: { id: "cust1", stamps: 4 }, operationId: "op1", cycleId: "cycle1" })
})

describe("POST /api/stamps", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(makeRequest({ customerId: "cust1", type: "stamp" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when customerId is missing", async () => {
    const res = await POST(makeRequest({ type: "stamp" }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain("Customer ID")
  })

  it("rejects unknown operations before writing", async () => {
    const res = await POST(makeRequest({ customerId: "cust1", type: "banana" }))
    expect(res.status).toBe(400)
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it("passes tenant, operation and key to the transactional engine", async () => {
    await POST(makeRequest({ customerId: "cust1", type: "redeem" }, "retry-key"))
    expect(mockExecute).toHaveBeenCalledWith(expect.anything(), { businessId: dbUser.business.id, customerId: "cust1", type: "redeem", idempotencyKey: "retry-key" })
  })

  it("returns the stable engine response", async () => {
    const response = { event: "redeem", customer: { id: "cust1", stamps: 0 }, operationId: "op1", cycleId: "cycle1" }
    mockExecute.mockResolvedValue(response)
    const res = await POST(makeRequest({ customerId: "cust1", type: "redeem" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(response)
  })
})
