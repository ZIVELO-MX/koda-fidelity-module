import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { isExpired, daysUntilExpiry, addDays, toDateInputValue } from "../card-utils"

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
  it("returns 1 for expiry tomorrow", () => {
    expect(daysUntilExpiry(new Date(NOW.getTime() + 86_400_000))).toBe(1)
  })
  it("returns 7 for expiry in 7 days", () => {
    expect(daysUntilExpiry(new Date(NOW.getTime() + 7 * 86_400_000))).toBe(7)
  })
  it("returns negative for past date", () => {
    expect(daysUntilExpiry(new Date(NOW.getTime() - 86_400_000))).toBe(-1)
  })
  it("returns 0 for expiry in less than a day", () => {
    expect(daysUntilExpiry(new Date(NOW.getTime() + 3600 * 1000))).toBe(1)
  })
})

describe("addDays", () => {
  it("adds 7 days to today", () => {
    const result = addDays(7)
    const expected = new Date(NOW)
    expected.setDate(expected.getDate() + 7)
    expect(result.getFullYear()).toBe(expected.getFullYear())
    expect(result.getMonth()).toBe(expected.getMonth())
    expect(result.getDate()).toBe(expected.getDate())
  })
})

describe("toDateInputValue", () => {
  it("formats date as YYYY-MM-DD", () => {
    expect(toDateInputValue(new Date("2026-12-31T12:00:00Z"))).toBe("2026-12-31")
  })
})
