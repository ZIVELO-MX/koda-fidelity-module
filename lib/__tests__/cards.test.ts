import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/supabase-server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("next/server", () => ({
  NextResponse: { json: vi.fn() },
}))

import { ValidationError } from "../api-utils"

interface CardInput {
  name: string
  reward: string
  stampsRequired: number
}

function validateCard(input: CardInput): void {
  if (!input.name || typeof input.name !== "string" || !input.name.trim()) {
    throw new ValidationError("El nombre de la tarjeta es obligatorio")
  }
  if (!input.reward || typeof input.reward !== "string" || !input.reward.trim()) {
    throw new ValidationError("La recompensa es obligatoria")
  }
  if (typeof input.stampsRequired !== "number" || input.stampsRequired < 1 || input.stampsRequired > 100) {
    throw new ValidationError("Los sellos requeridos deben estar entre 1 y 100")
  }
}

describe("card creation validation", () => {
  it("accepts valid card input", () => {
    expect(() =>
      validateCard({ name: "Coffee Rewards", reward: "Free Coffee", stampsRequired: 10 }),
    ).not.toThrow()
  })

  it("rejects empty name", () => {
    expect(() =>
      validateCard({ name: "", reward: "Free Coffee", stampsRequired: 10 }),
    ).toThrow(ValidationError)
  })

  it("rejects whitespace-only name", () => {
    expect(() =>
      validateCard({ name: "   ", reward: "Free Coffee", stampsRequired: 10 }),
    ).toThrow(ValidationError)
  })

  it("rejects empty reward", () => {
    expect(() =>
      validateCard({ name: "Coffee", reward: "", stampsRequired: 10 }),
    ).toThrow(ValidationError)
  })

  it("rejects stampsRequired below 1", () => {
    expect(() =>
      validateCard({ name: "Coffee", reward: "Free Coffee", stampsRequired: 0 }),
    ).toThrow(ValidationError)
  })

  it("rejects stampsRequired above 100", () => {
    expect(() =>
      validateCard({ name: "Coffee", reward: "Free Coffee", stampsRequired: 101 }),
    ).toThrow(ValidationError)
  })

  it("accepts stampsRequired at boundaries (1 and 100)", () => {
    expect(() =>
      validateCard({ name: "A", reward: "B", stampsRequired: 1 }),
    ).not.toThrow()
    expect(() =>
      validateCard({ name: "A", reward: "B", stampsRequired: 100 }),
    ).not.toThrow()
  })
})
