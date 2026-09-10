import { describe, expect, it, vi } from "vitest"
import { resolveTheme } from "../card-themes"

function dbWith(theme: unknown) {
  return { loyaltyTheme: { findFirst: vi.fn().mockResolvedValue(theme) } } as never
}

describe("card theme contract", () => {
  it("returns no theme when the card leaves it unset", async () => {
    await expect(resolveTheme(dbWith(null), undefined, "LITE")).resolves.toEqual({ selectedThemeId: null, effectiveThemeId: null })
  })

  it("resolves a theme by stable code", async () => {
    await expect(resolveTheme(dbWith({ id: "theme-cafe", code: "cafeteria", plan: "LITE", isActive: true }), "cafeteria", "LITE")).resolves.toEqual({ selectedThemeId: "theme-cafe", effectiveThemeId: "theme-cafe" })
  })

  it("rejects a Pro-only theme for Lite", async () => {
    await expect(resolveTheme(dbWith({ id: "theme-pro", code: "pro", plan: "PRO", isActive: true }), "pro", "LITE")).rejects.toThrow("requiere plan Pro")
  })
})
