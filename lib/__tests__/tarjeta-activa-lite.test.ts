import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Con Lite hay una sola tarjeta activa, y archivarla dejaba al negocio sin
 * ninguna. Restaurar sigue las reglas de la tarjeta principal (PR #152).
 */
const { mockGetUser, mockUserFind, tx, mockCardFind, mockEntitlements } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUserFind: vi.fn(),
  mockCardFind: vi.fn(),
  mockEntitlements: vi.fn(),
  tx: {
    loyaltyCard: { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
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
vi.mock("@/lib/account-lifecycle", () => ({ getEntitlements: mockEntitlements, syncExpiredEntitlements: vi.fn(), applyEntitlements: vi.fn(async () => [{ id: "card2" }]) }))
vi.mock("next/server", () => ({ NextRequest: class {}, NextResponse: { json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { status: init?.status ?? 200 }) } }))

import { DELETE as archivar } from "@/app/api/cards/[id]/route"
import { POST as restaurar } from "@/app/api/cards/[id]/restore/route"

const params = { params: Promise.resolve({ id: "card2" }) }
const lite = { plan: "LITE", subscription: { id: "sub1" } }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: "auth1", email: "owner@biz.test" } }, error: null })
  mockUserFind.mockResolvedValue({ id: "u1", email: "owner@biz.test", name: "Owner", role: "admin", business: { id: "biz1" } })
  mockEntitlements.mockResolvedValue(lite)
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

  it("no activa ninguna si el negocio no tiene suscripción activa", async () => {
    mockCardFind.mockResolvedValue({ id: "card2", businessId: "biz1", status: "ACTIVE" })
    mockEntitlements.mockResolvedValue({ plan: "LITE", subscription: null })
    expect((await archivar(peticion, params)).status).toBe(200)
    expect(tx.loyaltyCard.count).not.toHaveBeenCalled()
    expect(tx.loyaltyCard.update).toHaveBeenCalledTimes(1)
  })

  it("no activa otra si todavía queda una activa", async () => {
    mockCardFind.mockResolvedValue({ id: "card2", businessId: "biz1", status: "ACTIVE" })
    tx.loyaltyCard.count.mockResolvedValue(1)
    expect((await archivar(peticion, params)).status).toBe(200)
    expect(tx.loyaltyCard.findFirst).not.toHaveBeenCalled()
    expect(tx.loyaltyCard.update).toHaveBeenCalledTimes(1)
  })
})

describe("restaurar una tarjeta", () => {
  const peticion = { url: "http://x/api/cards/card2/restore", headers: new Headers() } as never

  it("restaura una archivada con suscripción activa", async () => {
    mockCardFind.mockResolvedValue({ id: "card2", businessId: "biz1", status: "ARCHIVED" })
    expect((await restaurar(peticion, params)).status).toBe(200)
    expect(tx.loyaltyCard.update).toHaveBeenCalledWith({ where: { id: "card2" }, data: { isActive: true, status: "ACTIVE" } })
  })

  // Sin suscripción `getEntitlements` dice LITE y `applyEntitlements` dejaba la
  // tarjeta ACTIVE: un negocio dado de baja se reactivaba solo.
  it("no reactiva una cuenta sin suscripción activa", async () => {
    mockCardFind.mockResolvedValue({ id: "card2", businessId: "biz1", status: "ARCHIVED" })
    mockEntitlements.mockResolvedValue({ plan: "LITE", subscription: null })
    expect((await restaurar(peticion, params)).status).toBe(403)
    expect(tx.loyaltyCard.update).not.toHaveBeenCalled()
  })

  it.each(["DRAFT", "LOCKED_BY_PLAN"])("rechaza una tarjeta %s, que no está archivada", async (status) => {
    mockCardFind.mockResolvedValue({ id: "card2", businessId: "biz1", status })
    expect((await restaurar(peticion, params)).status).toBe(400)
    expect(tx.loyaltyCard.update).not.toHaveBeenCalled()
  })
})
