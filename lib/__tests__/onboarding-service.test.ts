import { describe, expect, it, vi } from "vitest"
import { advanceOnboarding } from "../onboarding-service"

function firstCardDb(subscription: unknown, hasBusiness = true) {
  const progress = {
    id: "progress-1", draftVersion: 3, firstCardId: null,
    businessDraft: { name: "Café", categoryId: "category-1" },
    cardDraft: { reward: "Café gratis", stampsRequired: 10, themeId: "theme-pro" },
  }
  const user = {
    id: "user-1", authUserId: "auth-1", email: "test@invalid.dev",
    businessId: hasBusiness ? "business-1" : null, onboardingProgress: progress,
  }
  const business = { id: "business-1", brandColor: "#ff6b35" }
  const tx = {
    onboardingProgress: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn() },
    business: { update: vi.fn().mockResolvedValue(business), create: vi.fn().mockResolvedValue(business) },
    user: { update: vi.fn() },
    subscription: { findFirst: vi.fn().mockResolvedValue(subscription) },
    loyaltyTheme: { findFirst: vi.fn().mockResolvedValue({ id: "theme-pro", plan: "PRO" }) },
    loyaltyCard: { create: vi.fn().mockResolvedValue({ id: "card-1" }) },
  }
  const persisted = {
    ...user, businessId: business.id, business,
    onboardingProgress: { ...progress, draftVersion: 4, step: "ACQUISITION", firstCardId: "card-1", firstCard: { id: "card-1" } },
  }
  const db = {
    user: { findUnique: vi.fn().mockResolvedValueOnce(user).mockResolvedValue(persisted) },
    businessCategory: { findUnique: vi.fn().mockResolvedValue({ id: "category-1", isActive: true }) },
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
  }
  return { db: db as unknown as Parameters<typeof advanceOnboarding>[0], tx, persisted }
}

describe("first onboarding card theme entitlements", () => {
  it.each([
    { name: "a new business without a subscription", subscription: null, hasBusiness: false, effectiveThemeId: null },
    { name: "an existing business without a subscription", subscription: null, hasBusiness: true, effectiveThemeId: null },
    { name: "Lite without a trial", subscription: { plan: "LITE", proAccessGranted: false }, hasBusiness: true, effectiveThemeId: null },
    { name: "Pro", subscription: { plan: "PRO" }, hasBusiness: true, effectiveThemeId: "theme-pro" },
    { name: "Lite with a current Pro trial", subscription: { plan: "LITE", proAccessGranted: true, proTrialEndsAt: new Date(Date.now() + 86400000) }, hasBusiness: true, effectiveThemeId: "theme-pro" },
    { name: "Lite with an expired Pro trial", subscription: { plan: "LITE", proAccessGranted: true, proTrialEndsAt: new Date(Date.now() - 86400000) }, hasBusiness: true, effectiveThemeId: null },
  ])("uses the effective plan for $name without publishing the draft", async ({ subscription, hasBusiness, effectiveThemeId }) => {
    const { db, tx } = firstCardDb(subscription, hasBusiness)

    await advanceOnboarding(db, "auth-1", "complete_card", 3)

    expect(tx.loyaltyCard.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      selectedThemeId: "theme-pro", effectiveThemeId, status: "DRAFT", isActive: false,
    }) })
  })
})

describe("first card onboarding response", () => {
  it("returns persisted progress with the first card and the next draft version", async () => {
    const { db, persisted } = firstCardDb(null)

    const result = await advanceOnboarding(db, "auth-1", "complete_card", 3)

    expect(result).toEqual(persisted)
    expect(result.onboardingProgress).toMatchObject({
      firstCardId: "card-1", draftVersion: 4, step: "ACQUISITION",
    })
  })
})

describe("repeating onboarding with an existing first card", () => {
  it("advances without creating a second card", async () => {
    const progress = {
      id: "progress-1",
      draftVersion: 3,
      firstCardId: "card-1",
      businessDraft: { name: "Café", categoryId: "category-1", reward: "Café gratis", stampsRequired: 10 },
      cardDraft: { reward: "Café gratis", stampsRequired: 10 },
    }
    const user = { id: "user-1", authUserId: "auth-1", businessId: "business-1", email: "test@invalid.dev", onboardingProgress: progress }
    const db = {
      user: { findUnique: vi.fn().mockResolvedValueOnce(user).mockResolvedValueOnce(user) },
      businessCategory: { findUnique: vi.fn().mockResolvedValue({ id: "category-1", isActive: true }) },
      onboardingProgress: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    } as any

    const result = await advanceOnboarding(db, "auth-1", "complete_card", 3)

    expect(result).toBe(user)
    expect(db.onboardingProgress.updateMany).toHaveBeenCalledWith({
      where: { id: "progress-1", draftVersion: 3 },
      data: { step: "ACQUISITION", draftVersion: { increment: 1 } },
    })
    expect(db).not.toHaveProperty("loyaltyCard")
  })
})
