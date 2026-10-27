import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const { transaction, findCard, requireWritableBusinessPrincipal, requireActivatedBusiness, syncExpiredEntitlements, persistPrimaryCardPreference } = vi.hoisted(() => ({
  transaction: vi.fn(),
  findCard: vi.fn(),
  requireWritableBusinessPrincipal: vi.fn(),
  requireActivatedBusiness: vi.fn(),
  syncExpiredEntitlements: vi.fn(),
  persistPrimaryCardPreference: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction, loyaltyCard: { findUnique: findCard } } }))
vi.mock("@/lib/api-utils", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")),
  requireWritableBusinessPrincipal,
  requireActivatedBusiness,
}))
vi.mock("@/lib/account-lifecycle", async () => ({
  ...(await vi.importActual<typeof import("@/lib/account-lifecycle")>("@/lib/account-lifecycle")),
  syncExpiredEntitlements,
  persistPrimaryCardPreference,
}))

import { ValidationError } from "@/lib/api-utils"
import { PUT } from "./route"

const principal = {
  business: { id: "business-owned" },
  user: { id: "admin-owned", role: "admin" as const },
}

const existingCard = {
  id: "card-owned",
  businessId: "business-owned",
  status: "ACTIVE",
  isActive: true,
  name: "Club",
  reward: "Café",
  stampsRequired: 10,
  milestoneRewards: [],
  selectedThemeId: null,
  effectiveThemeId: null,
}

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/cards/card-owned", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest
}

function transactionDb(plan: "LITE" | "PRO", liteCardId = "card-owned") {
  const subscription = {
    id: "subscription-owned",
    businessId: "business-owned",
    status: "ACTIVE",
    plan,
    proAccessGranted: false,
    proTrialEndsAt: null,
    liteCardId,
  }
  const tx = {
    subscription: { findFirst: vi.fn().mockResolvedValue(subscription), update: vi.fn() },
    loyaltyCard: { update: vi.fn().mockResolvedValue({ ...existingCard }) },
    cardConfiguration: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
  }
  transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx))
  return tx
}

describe("PUT /api/cards/{id} primary selection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireWritableBusinessPrincipal.mockResolvedValue(principal)
    requireActivatedBusiness.mockResolvedValue(undefined)
    syncExpiredEntitlements.mockResolvedValue(undefined)
    findCard.mockResolvedValue(existingCard)
  })

  it("keeps Lite from clearing its only primary card", async () => {
    const tx = transactionDb("LITE")
    persistPrimaryCardPreference.mockRejectedValueOnce(new ValidationError("Lite necesita una tarjeta principal"))
    const response = await PUT(request({ isPrimary: false }), { params: Promise.resolve({ id: "card-owned" }) })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("Lite necesita una tarjeta principal") })
    expect(persistPrimaryCardPreference).toHaveBeenCalledWith(tx, expect.objectContaining({
      cardId: "card-owned", plan: "LITE", isPrimary: false,
    }))
  })

  it("lets Lite save an edit with isPrimary false on a different card", async () => {
    const tx = transactionDb("LITE", "primary-card")
    persistPrimaryCardPreference.mockResolvedValue([])
    const response = await PUT(request({ name: "Edited card", isPrimary: false }), { params: Promise.resolve({ id: "card-owned" }) })

    expect(response.status).toBe(200)
    expect(persistPrimaryCardPreference).toHaveBeenCalledWith(tx, expect.objectContaining({
      cardId: "card-owned", plan: "LITE", isPrimary: false,
    }))
    expect(tx.subscription.update).not.toHaveBeenCalled()
  })

  it("saves the card as the Pro preference when the checkbox is checked", async () => {
    const tx = transactionDb("PRO")
    persistPrimaryCardPreference.mockResolvedValue([])
    const response = await PUT(request({ isPrimary: true }), { params: Promise.resolve({ id: "card-owned" }) })

    expect(response.status).toBe(200)
    expect(persistPrimaryCardPreference).toHaveBeenCalledWith(tx, expect.objectContaining({
      businessId: "business-owned",
      cardId: "card-owned",
      plan: "PRO",
      isPrimary: true,
    }))
  })
})

// Antes estos cuerpos llegaban crudos a Prisma y respondían 500 reintentable.
describe("PUT /api/cards/{id} rechaza campos con tipo inválido", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireWritableBusinessPrincipal.mockResolvedValue(principal)
    requireActivatedBusiness.mockResolvedValue(undefined)
    findCard.mockResolvedValue({ ...existingCard, brandColor: "#ff6b35" })
  })

  it.each([
    ["textColor como arreglo", { textColor: ["LIGHT"] }],
    ["sellos que no son número", { stampsRequired: "abc" }],
    ["una sorpresa null", { milestoneRewards: [null] }],
    ["una sorpresa sin sello", { milestoneRewards: [{ label: "Pan", probability: 50 }] }],
    ["una fecha inválida", { expiresAt: "x" }],
    ["un color nuevo que no es hexadecimal", { brandColor: "rojo" }],
  ])("%s → 400", async (_caso, campos) => {
    const tx = transactionDb("PRO")
    const response = await PUT(request(campos), { params: Promise.resolve({ id: "card-owned" }) })
    expect(response.status).toBe(400)
    expect(tx.loyaltyCard.update).not.toHaveBeenCalled()
  })

  // El panel reenvía el color guardado: uno viejo no debe impedir guardar lo demás.
  it("acepta el color que la tarjeta ya tenía", async () => {
    findCard.mockResolvedValue({ ...existingCard, brandColor: "naranja" })
    transactionDb("PRO")
    const response = await PUT(request({ brandColor: "naranja", name: "Club" }), { params: Promise.resolve({ id: "card-owned" }) })
    expect(response.status).toBe(200)
  })
})

describe("PUT /api/cards/{id} reordena sorpresas", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireWritableBusinessPrincipal.mockResolvedValue(principal)
    requireActivatedBusiness.mockResolvedValue(undefined)
    findCard.mockResolvedValue({ ...existingCard, milestoneRewards: [{ id: "pan" }, { id: "galleta" }] })
  })

  // El índice único (cardId, stampNumber) se revisa fila por fila: sin liberar
  // los números antes, intercambiar dos sorpresas daba P2002.
  it("libera los números antes de asignar los nuevos", async () => {
    const tx = transactionDb("PRO")
    const llamadas: string[] = []
    const milestoneReward = {
      updateMany: vi.fn(async ({ data }: { data: { stampNumber: unknown } }) => {
        llamadas.push(typeof data.stampNumber === "object" ? "liberar" : `asignar ${data.stampNumber}`)
        return { count: 1 }
      }),
      deleteMany: vi.fn(),
      create: vi.fn(),
    }
    Object.assign(tx, { milestoneReward })
    tx.loyaltyCard.update.mockResolvedValue({ ...existingCard, milestoneRewards: [] })
    const response = await PUT(request({ milestoneRewards: [
      { id: "pan", stampNumber: 5, label: "Pan", probability: 100 },
      { id: "galleta", stampNumber: 3, label: "Galleta", probability: 100 },
    ] }), { params: Promise.resolve({ id: "card-owned" }) })

    expect(response.status).toBe(200)
    expect(llamadas).toEqual(["liberar", "asignar 5", "asignar 3"])
    expect(milestoneReward.updateMany).toHaveBeenNthCalledWith(1, { where: { cardId: "card-owned" }, data: { stampNumber: { multiply: -1 } } })
  })
})
