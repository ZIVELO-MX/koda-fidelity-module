import { describe, expect, it } from "vitest"
import { latestPlanChangeNotice, planChangeFromMetadata } from "../plan-change-notice"

describe("planChangeFromMetadata", () => {
  it.each([
    [{ previousPlan: "PRO", effectivePlan: "LITE" }, { from: "PRO", to: "LITE" }],
    [{ previousPlan: "LITE", effectivePlan: "PRO" }, { from: "LITE", to: "PRO" }],
  ])("returns the changed plans", (metadata, expected) => {
    expect(planChangeFromMetadata(metadata)).toEqual(expected)
  })

  it("ignores unchanged, invalid, legacy and no longer current events", () => {
    expect(planChangeFromMetadata({ previousPlan: "PRO", effectivePlan: "PRO" })).toBeNull()
    expect(planChangeFromMetadata({ previousPlan: "INACTIVO", effectivePlan: "PRO" })).toBeNull()
    expect(planChangeFromMetadata({ plan: "LITE" })).toBeNull()
    expect(planChangeFromMetadata({ previousPlan: "PRO", effectivePlan: "LITE" }, "PRO")).toBeNull()
  })

  it("selects the latest unseen transition that matches the current plan", () => {
    expect(latestPlanChangeNotice([
      { id: "renewal", metadata: { previousPlan: "PRO", effectivePlan: "PRO" } },
      { id: "upgrade", metadata: { previousPlan: "LITE", effectivePlan: "PRO" } },
      { id: "older-downgrade", metadata: { previousPlan: "PRO", effectivePlan: "LITE" } },
    ], "PRO")).toEqual({ eventId: "upgrade", from: "LITE", to: "PRO" })
    expect(latestPlanChangeNotice([], null)).toBeNull()
  })

  it("infers transitions from older audit events that only stored the selected plan", () => {
    expect(latestPlanChangeNotice([
      { id: "lite-now", createdAt: new Date("2026-10-06T20:21:02Z"), metadata: { plan: "LITE" } },
      { id: "pro-before", createdAt: new Date("2026-10-06T20:01:41Z"), metadata: { plan: "PRO" } },
      { id: "first-lite", createdAt: new Date("2026-10-06T18:59:05Z"), metadata: { plan: "LITE" } },
      { id: "trial", createdAt: new Date("2026-10-06T01:38:35Z"), metadata: { plan: "LITE", proTrialEndsAt: "2026-11-06T01:38:31Z" } },
    ], "LITE")).toEqual({ eventId: "lite-now", from: "PRO", to: "LITE" })
  })
})
