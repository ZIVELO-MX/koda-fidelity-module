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
