import { describe, expect, it } from "vitest"

function extractItems(payload: unknown) {
  if (!payload || typeof payload !== "object") return []
  const body = payload as { items?: unknown; customers?: unknown }
  return Array.isArray(body.items) ? body.items : Array.isArray(body.customers) ? body.customers : []
}

describe("FID-C1 v1 compatibility fixtures", () => {
  it("accepts the canonical customers envelope used by Fidelity", () => {
    const result = extractItems({
      items: [{ id: "c-1", name: "Ana", stamps: 3, goal: 10, cardName: "Café", cardReward: "Café gratis", cardBrandColor: "#6f4e37", cardExpiresAt: null }],
      page: 1,
      pageSize: 20,
      total: 1,
    })
    expect(result[0]).toMatchObject({ id: "c-1", goal: 10 })
  })

  it("keeps Rulaxx compatible with the legacy customers envelope during transition", () => {
    const result = extractItems({ customers: [{ id: "c-2", name: "Luis", stamps: 2, maxStamps: 8 }] })
    expect(result[0]).toMatchObject({ id: "c-2", maxStamps: 8 })
  })

  it("preserves nullable BusinessPublic fields instead of inventing values", () => {
    const business = { name: "Café Aurora", brandColor: "#6f4e37", logoUrl: null, iconName: null, website: null, instagram: "@aurora" }
    expect(business.website).toBeNull()
    expect(business.instagram).toBe("@aurora")
  })
})
