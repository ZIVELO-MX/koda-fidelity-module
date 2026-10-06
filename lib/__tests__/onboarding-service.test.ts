import { describe, expect, it, vi } from "vitest"
import { advanceOnboarding, saveDraft } from "../onboarding-service"

function firstCardDb(subscription: unknown, hasBusiness = true) {
  const progress = {
    id: "progress-1", status: "IN_PROGRESS", draftVersion: 3, firstCardId: null,
    businessDraft: { name: "Café", categoryId: "category-1" },
    cardDraft: { reward: "Café gratis", stampsRequired: 10, themeId: "theme-pro", textColor: "LIGHT", iconName: "coffee", stampIconName: "star" },
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
    subscription: { findFirst: vi.fn().mockResolvedValue(subscription) },
    onboardingProgress: { findFirst: vi.fn().mockResolvedValue(null) },
    businessCategory: { findUnique: vi.fn().mockResolvedValue({ id: "category-1", isActive: true }) },
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
  }
  return { db: db as unknown as Parameters<typeof advanceOnboarding>[0], tx, persisted }
}

describe("first onboarding card theme entitlements", () => {
  it.each([
    { name: "a new business", subscription: null, hasBusiness: false },
    { name: "an existing business without a subscription", subscription: null, hasBusiness: true },
    { name: "Lite without a trial", subscription: { plan: "LITE", proAccessGranted: false }, hasBusiness: true },
    { name: "Pro", subscription: { plan: "PRO" }, hasBusiness: true },
    { name: "Lite with a current Pro trial", subscription: { plan: "LITE", proAccessGranted: true }, hasBusiness: true },
    { name: "Lite with an expired Pro trial", subscription: { plan: "LITE", proAccessGranted: true }, hasBusiness: true },
  ])("allows Pro configuration during onboarding for $name without publishing the draft", async ({ subscription, hasBusiness }) => {
    const { db, tx } = firstCardDb(subscription, hasBusiness)

    await advanceOnboarding(db, "auth-1", "complete_card", 3)

    expect(tx.loyaltyCard.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      selectedThemeId: "theme-pro", effectiveThemeId: "theme-pro", status: "DRAFT", isActive: false,
      textColor: "LIGHT", iconName: "coffee", stampIconName: "star",
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
      status: "IN_PROGRESS",
      draftVersion: 3,
      firstCardId: "card-1",
      businessDraft: { name: "Café", categoryId: "category-1", reward: "Café gratis", stampsRequired: 10 },
      cardDraft: { reward: "Café gratis", stampsRequired: 10 },
    }
    const user = { id: "user-1", authUserId: "auth-1", businessId: "business-1", email: "test@invalid.dev", onboardingProgress: progress }
    const db = {
      user: { findUnique: vi.fn().mockResolvedValueOnce(user).mockResolvedValueOnce(user) },
      subscription: { findFirst: vi.fn().mockResolvedValue(null) },
      businessCategory: { findUnique: vi.fn().mockResolvedValue({ id: "category-1", isActive: true }) },
      onboardingProgress: { findFirst: vi.fn().mockResolvedValue(null), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    } as any

    const result = await advanceOnboarding(db, "auth-1", "complete_card", 3)

    expect(result).toBe(user)
    expect(db.onboardingProgress.updateMany).toHaveBeenCalledWith({
      where: { id: "progress-1", draftVersion: 3 },
      data: { step: "CARD_READY", draftVersion: { increment: 1 } },
    })
    expect(db).not.toHaveProperty("loyaltyCard")
  })
})

describe("onboarding activation wall", () => {
  it("does not allow an awaiting account to advance or edit its draft", async () => {
    const progress = {
      id: "progress-1", status: "AWAITING_PAYMENT", step: "PAYWALL", draftVersion: 4,
      businessDraft: {}, cardDraft: {},
    }
    const user = { id: "user-1", authUserId: "auth-1", businessId: "business-1", email: "test@invalid.dev", onboardingProgress: progress }
    const db = {
      user: { findUnique: vi.fn().mockResolvedValue(user) },
      onboardingProgress: { updateMany: vi.fn() },
    } as any

    await expect(advanceOnboarding(db, "auth-1", "complete_acquisition", 4)).rejects.toThrow(/todavía no está activo/i)
    await expect(advanceOnboarding(db, "auth-1", "complete_intro", 4)).rejects.toThrow(/todavía no está activo/i)
    await expect(saveDraft(db, "auth-1", { draftVersion: 4, card: { reward: "Nueva" } })).rejects.toThrow(/esperando la activación/i)
    expect(db.onboardingProgress.updateMany).not.toHaveBeenCalled()
  })
})

describe("business onboarding identity", () => {
  it("requires the owner name and saves it when completing the business step", async () => {
    const progress = { id: "progress-1", draftVersion: 0, firstCardId: null, businessDraft: { ownerName: "Alex García", name: "Café", categoryId: "category-1" }, cardDraft: {} }
    const user = { id: "user-1", authUserId: "auth-1", email: "test@invalid.dev", businessId: null, onboardingProgress: progress }
    const tx = { onboardingProgress: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }, user: { update: vi.fn() } }
    const updated = { ...user, name: "Alex García", onboardingProgress: { ...progress, draftVersion: 1, step: "CARD" } }
    const db = { user: { findUnique: vi.fn().mockResolvedValueOnce(user).mockResolvedValue(updated) }, $transaction: vi.fn(async (fn: (transaction: any) => unknown) => fn(tx)) } as any

    await advanceOnboarding(db, "auth-1", "complete_business", 0)

    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { name: "Alex García" } })
    expect(tx.onboardingProgress.updateMany).toHaveBeenCalledWith({ where: { id: "progress-1", draftVersion: 0 }, data: { step: "CARD", draftVersion: { increment: 1 } } })
  })
})
