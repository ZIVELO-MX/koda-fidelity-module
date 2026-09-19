import { afterEach, describe, expect, it } from "vitest"
import { advanceMockOnboarding, getMockOnboarding, resetMockStateForTests, saveMockDraft } from "../onboarding-mock"

const originalMockEmail = process.env.FID_ONBOARDING_MOCK_EMAIL

afterEach(() => {
  resetMockStateForTests()
  if (originalMockEmail === undefined) delete process.env.FID_ONBOARDING_MOCK_EMAIL
  else process.env.FID_ONBOARDING_MOCK_EMAIL = originalMockEmail
})

function db() {
  const reads = {
    user: { findUnique: async () => ({ id: "user-1", email: "tester@dev.invalid", name: "Tester", role: "admin" }) },
    businessCategory: { findMany: async () => [{ id: "category-1", name: "Café" }] },
    loyaltyTheme: {
      findMany: async () => [{ id: "theme-pro", code: "foil", plan: "PRO" }],
      findFirst: async () => ({ id: "theme-pro", code: "foil", plan: "PRO", isActive: true }),
    },
  }
  return reads as never
}

describe("onboarding mock", () => {
  it("validates the full flow in memory and never needs a write API", async () => {
    process.env.FID_ONBOARDING_MOCK_EMAIL = "tester@dev.invalid"
    const database = db()
    const principal = { id: "auth-1", email: "tester@dev.invalid" }

    expect((await getMockOnboarding(database, principal)).mode).toBe("mock")
    const drafted = await saveMockDraft(database, principal, {
      draftVersion: 0,
      business: { name: "Café Aurora", categoryId: "category-1" },
      card: { reward: "Café gratis", stampsRequired: 8, themeId: "foil" },
    })
    const businessStep = await advanceMockOnboarding(database, principal, { action: "complete_business", draftVersion: drafted.onboarding.onboardingProgress.draftVersion })
    const cardStep = await advanceMockOnboarding(database, principal, { action: "complete_card", draftVersion: businessStep.onboarding.onboardingProgress.draftVersion })

    expect(cardStep.onboarding.onboardingProgress.step).toBe("ACQUISITION")
    expect(cardStep.onboarding.onboardingProgress.firstCardId).toBe("mock-card-user-1")
    expect(cardStep.onboarding.business).toBeNull()
  })

  it("rejects a different signed-in user from the target session", async () => {
    process.env.FID_ONBOARDING_MOCK_EMAIL = "tester@dev.invalid"
    await expect(getMockOnboarding(db(), { id: "auth-2", email: "other@dev.invalid" })).rejects.toMatchObject({ name: "ForbiddenError" })
  })
})
