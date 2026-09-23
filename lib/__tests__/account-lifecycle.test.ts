import { describe, expect, it } from "vitest"
import type { Subscription } from "@prisma/client"
import { AccountReadOnlyError } from "@/lib/api-utils"
import { addCalendarMonths, assertBusinessWritable, cancelClosure, normalizeProfileEmail, periodForInterval, resolveEffectiveEntitlements } from "../account-lifecycle"

describe("account lifecycle", () => {
  it("normalizes profile email keys", () => {
    expect(normalizeProfileEmail("  BEN@Example.COM ")).toBe("ben@example.com")
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
