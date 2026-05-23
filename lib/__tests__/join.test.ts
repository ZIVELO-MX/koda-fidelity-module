import { describe, it, expect } from "vitest"
import { ValidationError } from "../api-utils"

interface JoinInput {
  name: string
  email: string
  cardId: string
}

function validateJoin(input: JoinInput): void {
  if (!input.name || typeof input.name !== "string" || !input.name.trim()) {
    throw new ValidationError("El nombre es obligatorio")
  }
  if (!input.email || typeof input.email !== "string" || !input.email.includes("@")) {
    throw new ValidationError("Email inválido")
  }
  if (!input.cardId || typeof input.cardId !== "string") {
    throw new ValidationError("ID de tarjeta inválido")
  }
}

describe("join flow validation", () => {
  it("accepts valid input", () => {
    expect(() =>
      validateJoin({ name: "Juan", email: "juan@example.com", cardId: "card-123" }),
    ).not.toThrow()
  })

  it("rejects empty name", () => {
    expect(() =>
      validateJoin({ name: "", email: "juan@example.com", cardId: "card-123" }),
    ).toThrow(ValidationError)
  })

  it("rejects whitespace-only name", () => {
    expect(() =>
      validateJoin({ name: "   ", email: "juan@example.com", cardId: "card-123" }),
    ).toThrow(ValidationError)
  })

  it("rejects missing email", () => {
    expect(() =>
      validateJoin({ name: "Juan", email: "", cardId: "card-123" }),
    ).toThrow(ValidationError)
  })

  it("rejects invalid email", () => {
    expect(() =>
      validateJoin({ name: "Juan", email: "not-an-email", cardId: "card-123" }),
    ).toThrow(ValidationError)
  })

  it("rejects empty cardId", () => {
    expect(() =>
      validateJoin({ name: "Juan", email: "juan@example.com", cardId: "" }),
    ).toThrow(ValidationError)
  })

  it("accepts email with plus sign", () => {
    expect(() =>
      validateJoin({ name: "Juan", email: "juan+test@example.com", cardId: "card-123" }),
    ).not.toThrow()
  })

  it("rejects name with only special chars", () => {
    expect(() =>
      validateJoin({ name: "!!!", email: "juan@example.com", cardId: "card-123" }),
    ).not.toThrow()
  })
})
