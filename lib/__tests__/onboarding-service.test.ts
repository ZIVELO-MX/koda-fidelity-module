import { describe, expect, it, vi } from "vitest"
import { advanceOnboarding } from "../onboarding-service"

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
    } as never

    const result = await advanceOnboarding(db, "auth-1", "complete_card", 3)

    expect(result).toBe(user)
    expect(db.onboardingProgress.updateMany).toHaveBeenCalledWith({
      where: { id: "progress-1", draftVersion: 3 },
      data: { step: "ACQUISITION", draftVersion: { increment: 1 } },
    })
    expect(db).not.toHaveProperty("loyaltyCard")
  })
})
