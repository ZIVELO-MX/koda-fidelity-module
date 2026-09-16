import { describe, expect, it } from "vitest"
import { advanceSchema, onboardingDraftSchema } from "../onboarding-contracts"

describe("onboarding contracts", () => {
  it("keeps partial drafts nullable instead of inventing empty values", () => {
    const result = onboardingDraftSchema.safeParse({ draftVersion: 0, business: { name: "Mi negocio" }, acquisitionSource: null })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.card).toBeUndefined()
  })

  it("requires billing interval when selecting it", () => {
    expect(advanceSchema.safeParse({ action: "select_billing_interval", draftVersion: 1 }).success).toBe(true)
  })
})
