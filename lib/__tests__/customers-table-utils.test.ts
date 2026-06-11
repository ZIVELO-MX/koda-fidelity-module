import { describe, it, expect } from "vitest"
import { timeAgo, buildSortLink, type SortField, type SortOrder } from "@/components/dashboard/customers-table"

describe("timeAgo", () => {
  function daysAgo(days: number) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  }
  function hoursAgo(hours: number) {
    return new Date(Date.now() - hours * 60 * 60 * 1000)
  }
  function minutesAgo(minutes: number) {
    return new Date(Date.now() - minutes * 60 * 1000)
  }
  function secondsAgo(seconds: number) {
    return new Date(Date.now() - seconds * 1000)
  }

  it("returns 'hace unos segundos' for less than 60 seconds", () => {
    expect(timeAgo(secondsAgo(5))).toBe("hace unos segundos")
    expect(timeAgo(secondsAgo(59))).toBe("hace unos segundos")
  })

  it("returns 'hace X min' for 1–59 minutes", () => {
    expect(timeAgo(minutesAgo(1))).toBe("hace 1 min")
    expect(timeAgo(minutesAgo(30))).toBe("hace 30 min")
    expect(timeAgo(minutesAgo(59))).toBe("hace 59 min")
  })

  it("returns 'hace Xh' for 1–23 hours", () => {
    expect(timeAgo(hoursAgo(1))).toBe("hace 1h")
    expect(timeAgo(hoursAgo(12))).toBe("hace 12h")
    expect(timeAgo(hoursAgo(23))).toBe("hace 23h")
  })

  it("returns 'hace Xd' for 1+ days", () => {
    expect(timeAgo(daysAgo(1))).toBe("hace 1d")
    expect(timeAgo(daysAgo(7))).toBe("hace 7d")
    expect(timeAgo(daysAgo(30))).toBe("hace 30d")
  })
})

describe("buildSortLink", () => {
  const base = new URLSearchParams()
  const basePath = "/dashboard/customers"

  it("defaults to asc when sorting a different field", () => {
    const url = buildSortLink("name", "createdAt", "desc", base, basePath)
    expect(url).toContain("sort=name")
    expect(url).toContain("order=asc")
  })

  it("toggles asc → desc when clicking the active sorted field", () => {
    const url = buildSortLink("name", "name", "asc", base, basePath)
    expect(url).toContain("sort=name")
    expect(url).toContain("order=desc")
  })

  it("toggles desc → asc when clicking the active sorted field", () => {
    const url = buildSortLink("stamps", "stamps", "desc", base, basePath)
    expect(url).toContain("sort=stamps")
    expect(url).toContain("order=asc")
  })

  it("uses the provided basePath", () => {
    const url = buildSortLink("name", "createdAt", "asc", base, "/dashboard/cards/abc123")
    expect(url.startsWith("/dashboard/cards/abc123?")).toBe(true)
  })

  it("preserves existing params from base URLSearchParams", () => {
    const baseWithQ = new URLSearchParams({ q: "cafe", card: "card-1" })
    const url = buildSortLink("name", "createdAt", "asc", baseWithQ, basePath)
    expect(url).toContain("q=cafe")
    expect(url).toContain("card=card-1")
    expect(url).toContain("sort=name")
  })

  it("does not mutate the original base URLSearchParams", () => {
    const baseWithQ = new URLSearchParams({ q: "original" })
    buildSortLink("name", "createdAt", "asc", baseWithQ, basePath)
    expect(baseWithQ.get("sort")).toBeNull()
    expect(baseWithQ.get("order")).toBeNull()
  })

  it("accepts all valid SortField values", () => {
    const fields: SortField[] = ["name", "stamps", "createdAt"]
    const orders: SortOrder[] = ["asc", "desc"]
    for (const field of fields) {
      for (const order of orders) {
        expect(() => buildSortLink(field, field, order, base, basePath)).not.toThrow()
      }
    }
  })
})
