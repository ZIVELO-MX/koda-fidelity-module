import { describe, it, expect } from "vitest"
import { ValidationError } from "../api-utils"

interface BusinessUpdateInput {
  name?: string
  brandColor?: string
  logoUrl?: string | null
}

function validateBusinessUpdate(input: BusinessUpdateInput): void {
  if (input.name !== undefined && (!input.name || typeof input.name !== "string" || !input.name.trim())) {
    throw new ValidationError("El nombre del negocio es obligatorio")
  }
  if (input.brandColor !== undefined && !/^#[0-9a-fA-F]{6}$/.test(input.brandColor)) {
    throw new ValidationError("El color debe ser un hexadecimal válido")
  }
}

describe("business update validation", () => {
  it("accepts valid name update", () => {
    expect(() => validateBusinessUpdate({ name: "Mi Negocio" })).not.toThrow()
  })

  it("accepts valid brandColor update", () => {
    expect(() => validateBusinessUpdate({ brandColor: "#f97316" })).not.toThrow()
  })

  it("accepts all fields", () => {
    expect(() =>
      validateBusinessUpdate({ name: "Mi Negocio", brandColor: "#3b82f6", logoUrl: "https://example.com/logo.png" }),
    ).not.toThrow()
  })

  it("accepts logoUrl as null", () => {
    expect(() => validateBusinessUpdate({ logoUrl: null })).not.toThrow()
  })

  it("rejects empty name", () => {
    expect(() => validateBusinessUpdate({ name: "" })).toThrow(ValidationError)
  })

  it("rejects whitespace-only name", () => {
    expect(() => validateBusinessUpdate({ name: "   " })).toThrow(ValidationError)
  })

  it("rejects invalid hex color", () => {
    expect(() => validateBusinessUpdate({ brandColor: "red" })).toThrow(ValidationError)
  })

  it("rejects short hex color", () => {
    expect(() => validateBusinessUpdate({ brandColor: "#fff" })).toThrow(ValidationError)
  })

  it("accepts undefined name (not provided)", () => {
    expect(() => validateBusinessUpdate({ brandColor: "#000000" })).not.toThrow()
  })
})
