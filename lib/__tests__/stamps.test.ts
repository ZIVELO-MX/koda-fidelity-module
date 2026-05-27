import { describe, it, expect } from "vitest"

interface StampParams {
  currentStamps: number
  stampsRequired: number
  type: "stamp" | "redeem"
}

interface StampResult {
  success: boolean
  newStamps: number
  event: "stamp" | "redeem"
  error?: string
}

function processStamp(params: StampParams): StampResult {
  const { currentStamps, stampsRequired, type } = params

  if (currentStamps < 0 || stampsRequired < 1) {
    return { success: false, newStamps: currentStamps, event: type, error: "Invalid state" }
  }

  if (type === "stamp") {
    if (currentStamps >= stampsRequired) {
      return {
        success: false,
        newStamps: currentStamps,
        event: type,
        error: "Customer has completed the card and must redeem first.",
      }
    }
    return { success: true, newStamps: currentStamps + 1, event: "stamp" }
  }

  if (type === "redeem") {
    if (currentStamps < stampsRequired) {
      return {
        success: false,
        newStamps: currentStamps,
        event: type,
        error: `Customer needs ${stampsRequired - currentStamps} more stamps to redeem`,
      }
    }
    return { success: true, newStamps: 0, event: "redeem" }
  }

  return { success: false, newStamps: currentStamps, event: type, error: "Invalid type" }
}

describe("stamp business logic", () => {
  describe("adding stamps", () => {
    it("increments stamps when below required", () => {
      const result = processStamp({ currentStamps: 3, stampsRequired: 10, type: "stamp" })
      expect(result.success).toBe(true)
      expect(result.newStamps).toBe(4)
      expect(result.event).toBe("stamp")
    })

    it("increments stamps at the edge (stampsRequired - 1)", () => {
      const result = processStamp({ currentStamps: 9, stampsRequired: 10, type: "stamp" })
      expect(result.success).toBe(true)
      expect(result.newStamps).toBe(10)
    })

    it("rejects stamp when card is already full", () => {
      const result = processStamp({ currentStamps: 10, stampsRequired: 10, type: "stamp" })
      expect(result.success).toBe(false)
      expect(result.error).toContain("completed")
    })

    it("rejects stamp when over the limit", () => {
      const result = processStamp({ currentStamps: 12, stampsRequired: 10, type: "stamp" })
      expect(result.success).toBe(false)
    })
  })

  describe("redeeming rewards", () => {
    it("redeems when stamps meet required", () => {
      const result = processStamp({ currentStamps: 10, stampsRequired: 10, type: "redeem" })
      expect(result.success).toBe(true)
      expect(result.newStamps).toBe(0)
      expect(result.event).toBe("redeem")
    })

    it("redeems when stamps exceed required", () => {
      const result = processStamp({ currentStamps: 12, stampsRequired: 10, type: "redeem" })
      expect(result.success).toBe(true)
      expect(result.newStamps).toBe(0)
    })

    it("rejects redeem when stamps are insufficient", () => {
      const result = processStamp({ currentStamps: 3, stampsRequired: 10, type: "redeem" })
      expect(result.success).toBe(false)
      expect(result.error).toContain("needs")
    })

    it("rejects redeem at zero stamps", () => {
      const result = processStamp({ currentStamps: 0, stampsRequired: 10, type: "redeem" })
      expect(result.success).toBe(false)
    })
  })
})
