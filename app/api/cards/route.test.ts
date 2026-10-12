import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const { transaction, requireWritableBusinessPrincipal, requireActivatedBusiness, syncExpiredEntitlements, persistPrimaryCardPreference, resolveTheme } = vi.hoisted(() => ({
  transaction: vi.fn(),
  requireWritableBusinessPrincipal: vi.fn(),
  requireActivatedBusiness: vi.fn(),
  syncExpiredEntitlements: vi.fn(),
  persistPrimaryCardPreference: vi.fn(),
  resolveTheme: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }))
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
vi.mock("@/lib/card-themes", () => ({ resolveTheme }))

import { POST } from "./route"

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
