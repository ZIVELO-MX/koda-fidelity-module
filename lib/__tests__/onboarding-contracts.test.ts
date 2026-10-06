import { describe, expect, it } from "vitest"
import { advanceSchema, onboardingDraftSchema } from "../onboarding-contracts"

describe("onboarding contracts", () => {
  it("keeps partial drafts nullable instead of inventing empty values", () => {
    const result = onboardingDraftSchema.safeParse({ draftVersion: 0, business: { ownerName: "Alex García", name: "Mi negocio" }, acquisitionSource: null })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.card).toBeUndefined()
  })

  it("requires billing interval when selecting it", () => {
    expect(advanceSchema.safeParse({ action: "select_billing_interval", draftVersion: 1 }).success).toBe(true)
  })

  it("accepts and preserves first card appearance choices in the draft", () => {
    const result = onboardingDraftSchema.parse({
      draftVersion: 2,
      card: { textColor: "LIGHT", themeId: "foil", iconName: "coffee", stampIconName: null },
    })
    expect(result.card).toEqual({ textColor: "LIGHT", themeId: "foil", iconName: "coffee", stampIconName: null })
  })
})
