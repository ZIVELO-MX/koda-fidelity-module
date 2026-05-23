import { describe, it, expect } from "vitest"
import { ValidationError } from "../api-utils"

interface CardUpdateInput {
  name?: string
  reward?: string
  stampsRequired?: number
  brandColor?: string
  description?: string | null
  expiresAt?: string | null
}

function validateCardUpdate(input: CardUpdateInput): void {
  if (input.name !== undefined && (!input.name || typeof input.name !== "string" || !input.name.trim())) {
    throw new ValidationError("El nombre de la tarjeta es obligatorio")
  }
  if (input.reward !== undefined && (!input.reward || typeof input.reward !== "string" || !input.reward.trim())) {
    throw new ValidationError("La recompensa es obligatoria")
  }
  if (input.stampsRequired !== undefined) {
    const s = Number(input.stampsRequired)
    if (s < 1 || s > 100) throw new ValidationError("Los sellos requeridos deben estar entre 1 y 100")
  }
}

describe("card update validation", () => {
  it("accepts partial update with only name", () => {
    expect(() => validateCardUpdate({ name: "New Name" })).not.toThrow()
  })

  it("accepts partial update with only reward", () => {
    expect(() => validateCardUpdate({ reward: "New Reward" })).not.toThrow()
  })

  it("accepts partial update with only stampsRequired", () => {
    expect(() => validateCardUpdate({ stampsRequired: 5 })).not.toThrow()
  })

  it("accepts partial update with all fields", () => {
    expect(() =>
      validateCardUpdate({ name: "Coffee", reward: "Free Coffee", stampsRequired: 10, brandColor: "#000000" }),
    ).not.toThrow()
  })

  it("rejects empty name on update", () => {
    expect(() => validateCardUpdate({ name: "" })).toThrow(ValidationError)
  })

  it("rejects whitespace-only name on update", () => {
    expect(() => validateCardUpdate({ name: "   " })).toThrow(ValidationError)
  })

  it("rejects empty reward on update", () => {
    expect(() => validateCardUpdate({ reward: "" })).toThrow(ValidationError)
  })

  it("rejects stampsRequired below 1 on update", () => {
    expect(() => validateCardUpdate({ stampsRequired: 0 })).toThrow(ValidationError)
  })

  it("rejects stampsRequired above 100 on update", () => {
    expect(() => validateCardUpdate({ stampsRequired: 101 })).toThrow(ValidationError)
  })

  it("accepts undefined name (not provided)", () => {
    expect(() => validateCardUpdate({ reward: "Free Coffee" })).not.toThrow()
  })

  it("accepts stampsRequired at boundaries", () => {
    expect(() => validateCardUpdate({ stampsRequired: 1 })).not.toThrow()
    expect(() => validateCardUpdate({ stampsRequired: 100 })).not.toThrow()
  })
})
