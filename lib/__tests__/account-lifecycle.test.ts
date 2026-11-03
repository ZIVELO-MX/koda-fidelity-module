import { describe, expect, it, vi } from "vitest"
import type { Subscription } from "@prisma/client"
import { AccountReadOnlyError } from "@/lib/api-utils"
import { addCalendarMonths, applyEntitlements, assertBusinessWritable, cancelClosure, createCustomerProfile, normalizeProfileEmail, periodForInterval, persistPrimaryCardPreference, resolveEffectiveEntitlements, resolveNewCardPrimarySelection } from "../account-lifecycle"

describe("account lifecycle", () => {
  it("normalizes profile email keys", () => {
    expect(normalizeProfileEmail("  BEN@Example.COM ")).toBe("ben@example.com")
  })

  it("claims a card profile that has no auth identity yet", async () => {
    const profile = { id: "profile-1", authUserId: null, emailNormalized: "customer@example.com", name: "QR customer", avatarPath: null }
    const update = vi.fn().mockResolvedValue({ ...profile, authUserId: "auth-1", name: "Customer" })
    const db = { customerProfile: { findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(profile), update, create: vi.fn() } } as never

    const linked = await createCustomerProfile(db, { authUserId: "auth-1", email: "CUSTOMER@example.com", name: "Customer" })

    expect(update).toHaveBeenCalledWith({ where: { id: "profile-1" }, data: { authUserId: "auth-1", name: "Customer", avatarPath: null } })
    expect(linked.authUserId).toBe("auth-1")
  })

  it("uses calendar periods and clamps month ends", () => {
    expect(addCalendarMonths(new Date("2026-01-31T12:00:00.000Z"), 1).toISOString()).toBe("2026-02-28T12:00:00.000Z")
    expect(periodForInterval(new Date("2026-02-28T12:00:00.000Z"), "ANNUAL").toISOString()).toBe("2027-02-28T12:00:00.000Z")
  })

  it("expires Lite Pro access exactly at the stored trial boundary", () => {
    const trialEndsAt = new Date("2026-02-28T12:00:00.000Z")
    const subscription = {
      plan: "LITE",
      proAccessGranted: true,
      proTrialEndsAt: trialEndsAt,
    } as Subscription

    expect(resolveEffectiveEntitlements(subscription, new Date("2026-02-28T11:59:59.999Z"))).toEqual({ plan: "PRO", trial: true })
    expect(resolveEffectiveEntitlements(subscription, trialEndsAt)).toEqual({ plan: "LITE", trial: false })
    expect(resolveEffectiveEntitlements({ ...subscription, proTrialEndsAt: null }, new Date("2026-01-31T12:00:00.000Z"))).toEqual({ plan: "LITE", trial: false })
    expect(resolveEffectiveEntitlements({ ...subscription, plan: "PRO", proTrialEndsAt: null }, new Date("2027-01-01T00:00:00.000Z"))).toEqual({ plan: "PRO", trial: false })
  })

  it("keeps the chosen Lite card active, falls Pro themes back, and leaves archives and drafts untouched", async () => {
    const cards = [
      { id: "chosen", status: "LOCKED_BY_PLAN", isLite: false, selectedThemeId: "pro-theme" },
      { id: "other", status: "ACTIVE", isLite: true, selectedThemeId: "lite-theme" },
      { id: "archived", status: "ARCHIVED", isLite: false, selectedThemeId: null },
      { id: "draft", status: "DRAFT", isLite: false, selectedThemeId: null },
    ]
    const updates: Array<{ id: string; data: Record<string, unknown> }> = []
    const db = {
      loyaltyCard: {
        findMany: vi.fn().mockResolvedValue(cards),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          updates.push({ id: where.id, data })
          return { id: where.id, ...data }
        }),
      },
      loyaltyTheme: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ plan: where.id === "pro-theme" ? "PRO" : "LITE" })),
      },
    } as never

    const entitled = await applyEntitlements(db, "business", "LITE", { preferredCardId: "chosen", preserveDrafts: true })

    expect(entitled.map(({ id }) => id)).toEqual(["chosen"])
    expect(updates).toEqual([
      { id: "chosen", data: { isActive: true, isLite: true, status: "ACTIVE", effectiveThemeId: null } },
      { id: "other", data: { isActive: false, isLite: false, status: "LOCKED_BY_PLAN", effectiveThemeId: "lite-theme" } },
    ])
  })

  it("defaults the first Lite card to primary and saves later unselected cards as plan-locked", () => {
    expect(resolveNewCardPrimarySelection("LITE", null, false)).toEqual({ isPrimary: true, status: "ACTIVE" })
    expect(resolveNewCardPrimarySelection("LITE", "current", false)).toEqual({ isPrimary: false, status: "LOCKED_BY_PLAN" })
    expect(resolveNewCardPrimarySelection("LITE", "current", true)).toEqual({ isPrimary: true, status: "ACTIVE" })
    expect(resolveNewCardPrimarySelection("PRO", null, undefined)).toEqual({ isPrimary: true, status: "ACTIVE" })
    expect(resolveNewCardPrimarySelection("PRO", "current", false)).toEqual({ isPrimary: false, status: "ACTIVE" })
  })

  it("updates a Lite primary selection and keeps the previous card locked", async () => {
    const subscriptionUpdate = vi.fn().mockResolvedValue({})
    const cardUpdate = vi.fn().mockResolvedValue({})
    const db = {
      subscription: { update: subscriptionUpdate },
      loyaltyCard: {
        findMany: vi.fn().mockResolvedValue([
          { id: "chosen", status: "LOCKED_BY_PLAN", isLite: false, selectedThemeId: null },
          { id: "other", status: "ACTIVE", isLite: true, selectedThemeId: null },
        ]),
        update: cardUpdate,
      },
      loyaltyTheme: { findUnique: vi.fn().mockResolvedValue(null) },
    } as never
    const subscription = { id: "subscription", liteCardId: "other" }

    await persistPrimaryCardPreference(db, {
      businessId: "business",
      subscription,
      cardId: "chosen",
      plan: "LITE",
      isPrimary: true,
    })

    expect(subscriptionUpdate).toHaveBeenCalledWith({ where: { id: "subscription" }, data: { liteCardId: "chosen" } })
    expect(cardUpdate).toHaveBeenCalledWith({
      where: { id: "chosen" },
      data: { isActive: true, isLite: true, status: "ACTIVE", effectiveThemeId: null },
    })
    expect(cardUpdate).toHaveBeenCalledWith({
      where: { id: "other" },
      data: { isActive: false, isLite: false, status: "LOCKED_BY_PLAN", effectiveThemeId: null },
    })
  })

  it("lets Lite leave a non-primary card unchecked without changing the saved primary", async () => {
    const update = vi.fn()
    const findFirst = vi.fn().mockResolvedValue({ id: "primary", name: "Primary" })
    const db = { subscription: { update }, loyaltyCard: { findFirst } } as never

    await expect(persistPrimaryCardPreference(db, {
      businessId: "business",
      subscription: { id: "subscription", liteCardId: "primary" },
      cardId: "other",
      plan: "LITE",
      isPrimary: false,
    })).resolves.toEqual([])

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "primary", businessId: "business", status: { in: ["ACTIVE", "LOCKED_BY_PLAN"] } },
    }))
    expect(update).not.toHaveBeenCalled()
  })

  it("does not let Lite uncheck its current primary, including the oldest-card fallback", async () => {
    const findFirst = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "primary", name: "Primary" })
    const db = { subscription: { update: vi.fn() }, loyaltyCard: { findFirst } } as never

    await expect(persistPrimaryCardPreference(db, {
      businessId: "business",
      subscription: { id: "subscription", liteCardId: "stale-card" },
      cardId: "primary",
      plan: "LITE",
      isPrimary: false,
    })).rejects.toMatchObject({ name: "ValidationError" })

    expect(findFirst).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { businessId: "business", status: "ACTIVE", isActive: true },
      orderBy: { createdAt: "asc" },
    }))
  })

  it("clears the saved primary preference when a Pro user unchecks the current card", async () => {
    const update = vi.fn().mockResolvedValue({})
    const db = { subscription: { update } } as never

    await persistPrimaryCardPreference(db, {
      businessId: "business",
      subscription: { id: "subscription", liteCardId: "chosen" },
      cardId: "chosen",
      plan: "PRO",
      isPrimary: false,
    })

    expect(update).toHaveBeenCalledWith({ where: { id: "subscription" }, data: { liteCardId: null } })
  })

  it("blocks writes while a closure is active and permits cancellation before its deadline", async () => {
    const db = {
      accountClosure: {
        findFirst: async () => ({ scheduledFor: new Date("2026-02-01T00:00:00.000Z") }),
        updateMany: async () => ({ count: 1 }),
      },
    } as never
    await expect(assertBusinessWritable(db, "business")).rejects.toBeInstanceOf(AccountReadOnlyError)
    await expect(cancelClosure(db, "business", new Date("2026-01-01T00:00:00.000Z"))).resolves.toEqual({ count: 1 })
  })

  it("does not report cancellation when the grace period is already over", async () => {
    const db = { accountClosure: { updateMany: async () => ({ count: 0 }) } } as never
    await expect(cancelClosure(db, "business", new Date("2026-02-01T00:00:00.000Z"))).rejects.toMatchObject({ name: "ConflictError" })
  })
})
