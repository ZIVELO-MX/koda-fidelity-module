import { describe, expect, it } from "vitest"
import { addCalendarMonths, normalizeProfileEmail, periodForInterval } from "../account-lifecycle"

describe("account lifecycle", () => {
  it("normalizes profile email keys", () => {
    expect(normalizeProfileEmail("  BEN@Example.COM ")).toBe("ben@example.com")
  })

  it("uses calendar periods and clamps month ends", () => {
    expect(addCalendarMonths(new Date("2026-01-31T12:00:00.000Z"), 1).toISOString()).toBe("2026-02-28T12:00:00.000Z")
    expect(periodForInterval(new Date("2026-02-28T12:00:00.000Z"), "ANNUAL").toISOString()).toBe("2027-02-28T12:00:00.000Z")
  })
})
