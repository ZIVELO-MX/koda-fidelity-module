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

  it("rejects a Pro-only theme for Lite", async () => {
    const db = { loyaltyTheme: { findFirst: vi.fn().mockResolvedValueOnce({ id: "theme-pro", code: "pro", plan: "PRO", isActive: true }).mockResolvedValueOnce({ id: "theme-lite", code: "cafeteria", plan: "LITE", isActive: true }) } } as never
    await expect(resolveTheme(db, "pro", "LITE")).resolves.toEqual({ selectedThemeId: "theme-pro", effectiveThemeId: "theme-lite", themeLocked: true })
  })
})
