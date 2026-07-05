import { describe, expect, it } from "vitest"
import { withCurrentCycleMilestoneClaims } from "@/app/api/join/route"

const oldClaim = { id: "old", createdAt: new Date("2026-07-01T10:00:00Z") }
const currentClaim = { id: "current", createdAt: new Date("2026-07-03T10:00:00Z") }

describe("current milestone reward cycle", () => {
  it("keeps all earned rewards when the customer has not redeemed", () => {
    const customer = withCurrentCycleMilestoneClaims({
      id: "customer-1",
      milestoneClaims: [currentClaim, oldClaim],
      stampsLog: [],
    })

    expect(customer.milestoneClaims).toEqual([currentClaim, oldClaim])
    expect(customer).not.toHaveProperty("stampsLog")
  })

  it("hides rewards earned before the latest redemption", () => {
    const customer = withCurrentCycleMilestoneClaims({
      id: "customer-1",
      milestoneClaims: [currentClaim, oldClaim],
      stampsLog: [{ createdAt: new Date("2026-07-02T10:00:00Z") }],
    })

    expect(customer.milestoneClaims).toEqual([currentClaim])
    expect(customer).not.toHaveProperty("stampsLog")
  })
})
