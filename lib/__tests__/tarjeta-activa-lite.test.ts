import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Con Lite hay una sola tarjeta activa. Restaurar respondía 200 y la dejaba
 * bloqueada, y archivar la activa dejaba al negocio sin ninguna.
 */
const { mockGetUser, mockUserFind, tx, mockCardFind, mockEntitlements } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUserFind: vi.fn(),
  mockCardFind: vi.fn(),
  mockEntitlements: vi.fn(),
  tx: {
    loyaltyCard: { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    loyaltyTheme: { findUnique: vi.fn() },
    subscription: { update: vi.fn() },
  },
}))
vi.mock("@/lib/supabase-server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })) }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFind },
    accountClosure: { findFirst: vi.fn().mockResolvedValue(null) },
    loyaltyCard: { findUnique: mockCardFind },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}))
vi.mock("@/lib/account-lifecycle", () => ({ getEntitlements: mockEntitlements, syncExpiredEntitlements: vi.fn() }))
vi.mock("next/server", () => ({ NextRequest: class {}, NextResponse: { json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { status: init?.status ?? 200 }) } }))

import { POST as restaurar } from "@/app/api/cards/[id]/restore/route"
import { DELETE as archivar } from "@/app/api/cards/[id]/route"

const params = { params: Promise.resolve({ id: "card2" }) }
const lite = { plan: "LITE", subscription: { id: "sub1" } }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: "auth1", email: "owner@biz.test" } }, error: null })
  mockUserFind.mockResolvedValue({ id: "u1", email: "owner@biz.test", name: "Owner", role: "admin", business: { id: "biz1" } })
  mockEntitlements.mockResolvedValue(lite)
})

describe("restaurar con Lite", () => {
  it("lo impide y lo explica si ya hay otra activa", async () => {
    mockCardFind.mockResolvedValue({ id: "card2", businessId: "biz1", status: "ARCHIVED", selectedThemeId: null })
    tx.loyaltyCard.findFirst.mockResolvedValue({ id: "card1" })
    const res = await restaurar({ headers: new Headers() } as never, params)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/solo puede haber una tarjeta activa/)
    expect(tx.loyaltyCard.update).not.toHaveBeenCalled()
  })

  it("la activa sin acabado Pro y la deja como la tarjeta Lite", async () => {
    mockCardFind.mockResolvedValue({ id: "card2", businessId: "biz1", status: "ARCHIVED", selectedThemeId: "pro1" })
    tx.loyaltyCard.findFirst.mockResolvedValue(null)
    tx.loyaltyTheme.findUnique.mockResolvedValue({ plan: "PRO" })
    const res = await restaurar({ headers: new Headers() } as never, params)
    expect(res.status).toBe(200)
    expect(tx.loyaltyCard.update).toHaveBeenCalledWith({ where: { id: "card2" }, data: { isActive: true, status: "ACTIVE", isLite: true, effectiveThemeId: null } })
    expect(tx.subscription.update).toHaveBeenCalledWith({ where: { id: "sub1" }, data: { liteCardId: "card2" } })
  })
})

describe("archivar la activa con Lite", () => {
  const peticion = { url: "http://x/api/cards/card2", headers: new Headers() } as never

  it("activa la bloqueada más antigua si no queda ninguna", async () => {
    mockCardFind.mockResolvedValue({ id: "card2", businessId: "biz1", status: "ACTIVE" })
    tx.loyaltyCard.count.mockResolvedValue(0)
    tx.loyaltyCard.findFirst.mockResolvedValue({ id: "card3" })
    expect((await archivar(peticion, params)).status).toBe(200)
    expect(tx.loyaltyCard.update).toHaveBeenCalledWith({ where: { id: "card3" }, data: { isActive: true, isLite: true, status: "ACTIVE" } })
    expect(tx.subscription.update).toHaveBeenCalledWith({ where: { id: "sub1" }, data: { liteCardId: "card3" } })
  })

  it("no activa otra si todavía queda una activa", async () => {
    mockCardFind.mockResolvedValue({ id: "card2", businessId: "biz1", status: "ACTIVE" })
    tx.loyaltyCard.count.mockResolvedValue(1)
    expect((await archivar(peticion, params)).status).toBe(200)
    expect(tx.loyaltyCard.findFirst).not.toHaveBeenCalled()
    expect(tx.loyaltyCard.update).toHaveBeenCalledTimes(1)
  })
})
