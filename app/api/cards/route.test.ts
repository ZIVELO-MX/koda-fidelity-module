import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const { transaction, findCards, groupStampLogs, getBusinessFromSession, requireWritableBusinessPrincipal, requireActivatedBusiness, syncExpiredEntitlements, persistPrimaryCardPreference, resolveTheme } = vi.hoisted(() => ({
  transaction: vi.fn(),
  findCards: vi.fn(),
  groupStampLogs: vi.fn(),
  getBusinessFromSession: vi.fn(),
  requireWritableBusinessPrincipal: vi.fn(),
  requireActivatedBusiness: vi.fn(),
  syncExpiredEntitlements: vi.fn(),
  persistPrimaryCardPreference: vi.fn(),
  resolveTheme: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction, loyaltyCard: { findMany: findCards }, stampLog: { groupBy: groupStampLogs } } }))
vi.mock("@/lib/api-utils", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")),
  getBusinessFromSession,
  requireWritableBusinessPrincipal,
  requireActivatedBusiness,
}))
vi.mock("@/lib/account-lifecycle", async () => ({
  ...(await vi.importActual<typeof import("@/lib/account-lifecycle")>("@/lib/account-lifecycle")),
  syncExpiredEntitlements,
  persistPrimaryCardPreference,
}))
vi.mock("@/lib/card-themes", () => ({ resolveTheme }))

import { GET, POST } from "./route"

const principal = {
  business: { id: "business-owned", brandColor: "#ff6b35", iconName: null },
  user: { id: "admin-owned", role: "admin" as const },
}

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest
}

function transactionDb() {
  let createdData: Record<string, unknown> = {}
  const subscription = {
    id: "subscription-owned",
    businessId: "business-owned",
    status: "ACTIVE",
    plan: "LITE",
    proAccessGranted: false,
    proTrialEndsAt: null,
    liteCardId: "current-card",
  }
  const tx = {
    subscription: { findFirst: vi.fn().mockResolvedValue(subscription) },
    loyaltyCard: {
      findFirst: vi.fn().mockResolvedValue({ id: "current-card" }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        createdData = { id: "new-card", ...data, milestoneRewards: [] }
        return createdData
      }),
      findUniqueOrThrow: vi.fn(async () => createdData),
    },
  }
  transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx))
  return tx
}

describe("POST /api/cards primary selection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireWritableBusinessPrincipal.mockResolvedValue(principal)
    requireActivatedBusiness.mockResolvedValue(undefined)
    syncExpiredEntitlements.mockResolvedValue({ plan: "LITE" })
    resolveTheme.mockResolvedValue({ selectedThemeId: null, effectiveThemeId: null, themeLocked: false })
  })

  it("stores an unchecked Lite card as plan-locked and keeps the current primary", async () => {
    const tx = transactionDb()
    const response = await POST(request({ name: "Respaldo", reward: "Café", isPrimary: false }))

    expect(response.status).toBe(201)
    expect(tx.loyaltyCard.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "LOCKED_BY_PLAN", isActive: false, isLite: false }),
    }))
    expect(persistPrimaryCardPreference).not.toHaveBeenCalled()
    expect(await response.json()).toMatchObject({ card: { id: "new-card", status: "LOCKED_BY_PLAN" } })
  })

  it("sets a checked Lite card as primary through the entitlement service", async () => {
    const tx = transactionDb()
    persistPrimaryCardPreference.mockResolvedValue([])
    const response = await POST(request({ name: "Principal nueva", reward: "Café", isPrimary: true }))

    expect(response.status).toBe(201)
    expect(tx.loyaltyCard.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "ACTIVE", isActive: true, isLite: true }),
    }))
    expect(persistPrimaryCardPreference).toHaveBeenCalledWith(tx, expect.objectContaining({
      businessId: "business-owned",
      cardId: "new-card",
      plan: "LITE",
      isPrimary: true,
    }))
  })
})

// Antes estos cuerpos llegaban crudos a Prisma y respondían 500 reintentable.
describe("POST /api/cards rechaza campos con tipo inválido", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireWritableBusinessPrincipal.mockResolvedValue(principal)
    requireActivatedBusiness.mockResolvedValue(undefined)
    resolveTheme.mockResolvedValue({ selectedThemeId: null, effectiveThemeId: null, themeLocked: false })
  })

  it.each([
    ["textColor como arreglo", { textColor: ["LIGHT"] }],
    ["sellos con decimales", { stampsRequired: 5.5 }],
    ["una sorpresa null", { milestoneRewards: [null] }],
    ["un sello de sorpresa en texto", { milestoneRewards: [{ stampNumber: "3", label: "Pan", probability: 50 }] }],
    ["una probabilidad con decimales", { milestoneRewards: [{ stampNumber: 3, label: "Pan", probability: 12.5 }] }],
    ["una fecha inválida", { expiresAt: "x" }],
    ["un color que no es hexadecimal", { brandColor: "rojo" }],
    ["un color que no es texto", { brandColor: {} }],
    ["una descripción numérica", { description: 5 }],
  ])("%s → 400", async (_caso, campos) => {
    const tx = transactionDb()
    const response = await POST(request({ name: "Club", reward: "Café", ...campos }))
    expect(response.status).toBe(400)
    expect(tx.loyaltyCard.create).not.toHaveBeenCalled()
  })
})

describe("GET /api/cards", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBusinessFromSession.mockResolvedValue(principal)
  })

  // Sumaba el saldo abierto de cada cliente, que vuelve a 0 al canjear, y
  // contaba también a los clientes dados de baja.
  it("cuenta los sellos dados y solo a los clientes activos", async () => {
    findCards.mockResolvedValue([{ id: "card-1", name: "Club", _count: { customers: 2 }, selectedTheme: null, effectiveTheme: null }])
    groupStampLogs.mockResolvedValue([{ cardId: "card-1", _count: { _all: 25 } }])

    const response = await GET(new Request("http://localhost/api/cards") as NextRequest)

    expect(response.status).toBe(200)
    expect((await response.json()).cards[0]).toMatchObject({ id: "card-1", customers: 2, totalStamps: 25 })
    expect(findCards).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ _count: { select: { customers: { where: { isActive: true } } } } }),
    }))
    expect(groupStampLogs).toHaveBeenCalledWith({ by: ["cardId"], where: { businessId: "business-owned", type: "stamp", cardId: { in: ["card-1"] } }, _count: { _all: true } })
  })
})
