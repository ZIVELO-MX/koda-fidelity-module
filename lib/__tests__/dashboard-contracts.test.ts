import { describe, expect, it } from "vitest"
import { activityQuerySchema, pageQuerySchema, statsQuerySchema } from "../dashboard-contracts"

describe("dashboard API contracts", () => {
  it("defaults the metrics window and rejects unsafe ranges", () => {
    expect(statsQuerySchema.parse({})).toEqual({ days: 30 })
    expect(statsQuerySchema.safeParse({ days: 91 }).success).toBe(false)
  })

  it("bounds list pagination and normalizes readyToRedeem", () => {
    expect(pageQuerySchema.parse({ readyToRedeem: "true" })).toMatchObject({ page: 1, limit: 20, readyToRedeem: true })
    expect(pageQuerySchema.safeParse({ limit: 101 }).success).toBe(false)
  })

  it("rejects oversized activity cursors", () => {
    expect(activityQuerySchema.safeParse({ cursor: "x".repeat(501) }).success).toBe(false)
  })
})
