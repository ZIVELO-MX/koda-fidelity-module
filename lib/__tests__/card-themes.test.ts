import { describe, expect, it, vi } from "vitest"
import { listActiveThemes, resolveTheme } from "../card-themes"

function dbWith(theme: unknown) {
  return { loyaltyTheme: { findFirst: vi.fn().mockResolvedValue(theme) } } as never
}

describe("card theme contract", () => {
  it("lists only active themes with the public catalog fields", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "theme-cafe", code: "cafeteria", plan: "LITE" }])
    await expect(listActiveThemes({ loyaltyTheme: { findMany } } as never)).resolves.toEqual([{ id: "theme-cafe", code: "cafeteria", plan: "LITE" }])
    expect(findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true, code: true, plan: true },
      orderBy: [{ plan: "asc" }, { code: "asc" }],
    })
  })

  it("returns no theme when the card leaves it unset", async () => {
    await expect(resolveTheme(dbWith(null), undefined, "LITE")).resolves.toEqual({ selectedThemeId: null, effectiveThemeId: null, themeLocked: false })
  })

  it("resolves a theme by stable code", async () => {
    await expect(resolveTheme(dbWith({ id: "theme-cafe", code: "cafeteria", plan: "LITE", isActive: true }), "cafeteria", "LITE")).resolves.toEqual({ selectedThemeId: "theme-cafe", effectiveThemeId: "theme-cafe", themeLocked: false })
  })

  it("keeps a Pro selection while falling back to the business color for Lite", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "theme-pro", code: "pro", plan: "PRO", isActive: true })
    await expect(resolveTheme({ loyaltyTheme: { findFirst } } as never, "pro", "LITE")).resolves.toEqual({ selectedThemeId: "theme-pro", effectiveThemeId: null, themeLocked: true })
    expect(findFirst).toHaveBeenCalledTimes(1)
  })
})
