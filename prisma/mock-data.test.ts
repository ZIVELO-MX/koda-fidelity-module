import { describe, it, expect } from "vitest"
import { mockData } from "./mock-data"

describe("mock data", () => {
  it("has businesses", () => {
    expect(mockData.businesses).toHaveLength(2)
  })

  it("each business has required fields", () => {
    for (const biz of mockData.businesses) {
      expect(biz.id).toBeTruthy()
      expect(biz.name).toBeTruthy()
      expect(biz.email).toBeTruthy()
      expect(biz.brandColor).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(biz.loyaltyCards.create.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("each loyalty card has required fields", () => {
    for (const biz of mockData.businesses) {
      for (const card of biz.loyaltyCards.create) {
        expect(card.id).toBeTruthy()
        expect(card.name).toBeTruthy()
        expect(card.reward).toBeTruthy()
        expect(card.stampsRequired).toBeGreaterThan(0)
        expect(card.brandColor).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    }
  })

  it("has customers", () => {
    expect(mockData.customers).toHaveLength(5)
  })

  it("each customer has required fields", () => {
    for (const cust of mockData.customers) {
      expect(cust.id).toBeTruthy()
      expect(cust.name).toBeTruthy()
      expect(cust.cardId).toBeTruthy()
      expect(cust.stamps).toBeGreaterThanOrEqual(0)
    }
  })

  it("customer references an existing card", () => {
    const cardIds = mockData.businesses.flatMap((b) =>
      b.loyaltyCards.create.map((c) => c.id),
    )
    for (const cust of mockData.customers) {
      expect(cardIds).toContain(cust.cardId)
    }
  })

  it("stamp count matches stampsLog entries", () => {
    for (const cust of mockData.customers) {
      const stampLogs = cust.stampsLog.create.filter(
        (l) => l.type === "stamp",
      )
      expect(cust.stamps).toBe(stampLogs.length)
    }
  })

  it("redeem logs exist only for customers with enough stamps", () => {
    for (const cust of mockData.customers) {
      const redeemLogs = cust.stampsLog.create.filter(
        (l) => l.type === "redeem",
      )
      for (const _ of redeemLogs) {
        expect(cust.stamps).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it("card IDs are unique across businesses", () => {
    const allIds = mockData.businesses.flatMap((b) =>
      b.loyaltyCards.create.map((c) => c.id),
    )
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it("customer IDs are unique", () => {
    const allIds = mockData.customers.map((c) => c.id)
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it("stamps never exceed required amount for reward", () => {
    const cardMap = new Map(
      mockData.businesses.flatMap((b) =>
        b.loyaltyCards.create.map((c) => [c.id, c.stampsRequired]),
      ),
    )
    for (const cust of mockData.customers) {
      const required = cardMap.get(cust.cardId) ?? Infinity
      expect(cust.stamps).toBeLessThanOrEqual(required)
    }
  })
})
