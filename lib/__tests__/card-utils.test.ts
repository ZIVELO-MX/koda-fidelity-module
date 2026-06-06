import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { isExpired, daysUntilExpiry, addDays, addMonths, addYears, toDateInputValue } from "../card-utils"

const NOW = new Date("2026-06-05T12:00:00Z")

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
afterEach(() => { vi.useRealTimers() })

describe("isExpired", () => {
  it("returns false for null", () => expect(isExpired(null)).toBe(false))
  it("returns false for undefined", () => expect(isExpired(undefined)).toBe(false))
  it("returns false for future date", () => expect(isExpired(new Date(NOW.getTime() + 86_400_000))).toBe(false))
  it("returns true for past date", () => expect(isExpired(new Date(NOW.getTime() - 1000))).toBe(true))
  it("returns true for past date string", () => expect(isExpired("2026-01-01T00:00:00Z")).toBe(true))
  it("returns false for future date string", () => expect(isExpired("2027-01-01T00:00:00Z")).toBe(false))
})

describe("daysUntilExpiry", () => {
  it("returns null for null", () => expect(daysUntilExpiry(null)).toBeNull())
  it("returns null for undefined", () => expect(daysUntilExpiry(undefined)).toBeNull())
  it("returns 1 for expiry tomorrow", () =>
    expect(daysUntilExpiry(new Date(NOW.getTime() + 86_400_000))).toBe(1))
  it("returns 7 for expiry in 7 days", () =>
    expect(daysUntilExpiry(new Date(NOW.getTime() + 7 * 86_400_000))).toBe(7))
  it("returns negative for past date", () =>
    expect(daysUntilExpiry(new Date(NOW.getTime() - 86_400_000))).toBe(-1))
})

describe("addDays", () => {
  it("adds 7 days keeping same day-of-month where possible", () => {
    const result = addDays(7)
    const expected = new Date(NOW)
    expected.setDate(expected.getDate() + 7)
    expect(toDateInputValue(result)).toBe(toDateInputValue(expected))
  })
})

describe("addMonths — calendar arithmetic", () => {
  it("adds 1 month: June 5 → July 5", () => {
    expect(toDateInputValue(addMonths(1))).toBe("2026-07-05")
  })
  it("adds 3 months: June 5 → September 5", () => {
    expect(toDateInputValue(addMonths(3))).toBe("2026-09-05")
  })
  it("adds 6 months: June 5 → December 5", () => {
    expect(toDateInputValue(addMonths(6))).toBe("2026-12-05")
  })
})

describe("addYears", () => {
  it("adds 1 year: June 5 2026 → June 5 2027", () => {
    expect(toDateInputValue(addYears(1))).toBe("2027-06-05")
  })
})

describe("toDateInputValue", () => {
  it("returns YYYY-MM-DD using local date components", () => {
    const d = new Date(2026, 11, 31, 23, 59, 59) // Dec 31 local, could be Jan 1 UTC+offset
    expect(toDateInputValue(d)).toBe("2026-12-31")
  })
})
