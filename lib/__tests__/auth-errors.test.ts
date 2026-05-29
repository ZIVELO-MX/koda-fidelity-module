import { describe, it, expect } from "vitest"
import { getFriendlyAuthError, getFriendlySendError } from "../auth-errors"

describe("getFriendlyAuthError", () => {
  it("returns expired error for otp_expired code", () => {
    const result = getFriendlyAuthError("", "otp_expired")
    expect(result).not.toBeNull()
    expect(result!.title).toBe("Enlace Expirado")
    expect(result!.description).toContain("válido")
  })

  it("returns expired error when message contains 'expired'", () => {
    const result = getFriendlyAuthError("Email link is invalid or has expired", "")
    expect(result?.title).toBe("Enlace Expirado")
  })

  it("returns rate limit error for rate_limit code", () => {
    const result = getFriendlyAuthError("", "rate_limit")
    expect(result?.title).toBe("Demasiados Intentos")
  })

  it("returns rate limit error when message contains 'rate_limit'", () => {
    const result = getFriendlyAuthError("over_email_send_rate_limit", "")
    expect(result?.title).toBe("Demasiados Intentos")
  })

  it("returns rate limit error when message contains 'rate limit' with space", () => {
    const result = getFriendlyAuthError("email rate limit exceeded", "")
    expect(result?.title).toBe("Demasiados Intentos")
  })

  it("returns invalid link error for invalid token", () => {
    const result = getFriendlyAuthError("Invalid token", "")
    expect(result?.title).toBe("Enlace No Válido")
  })

  it("returns invalid link error for 'not found' message", () => {
    const result = getFriendlyAuthError("Token not found", "")
    expect(result?.title).toBe("Enlace No Válido")
  })

  it("returns email not confirmed error", () => {
    const result = getFriendlyAuthError("Email not confirmed", "")
    expect(result?.title).toBe("Correo No Confirmado")
  })

  it("returns null for unknown errors", () => {
    const result = getFriendlyAuthError("Some random error", "")
    expect(result).toBeNull()
  })

  it("returns null for empty strings", () => {
    const result = getFriendlyAuthError("", "")
    expect(result).toBeNull()
  })
})

describe("getFriendlySendError", () => {
  it("returns rate limit message for rate_limit error", () => {
    expect(getFriendlySendError(new Error("rate_limit exceeded"))).toContain("demasiados")
  })

  it("returns rate limit message for over_email_send_rate_limit", () => {
    expect(getFriendlySendError(new Error("over_email_send_rate_limit"))).toContain("demasiados")
  })

  it("returns rate limit message for 'email rate limit exceeded' (Supabase exact error)", () => {
    expect(getFriendlySendError(new Error("email rate limit exceeded"))).toContain("demasiados")
  })

  it("returns rate limit message for error with code over_email_send_rate_limit", () => {
    const err = new Error("some other message")
    ;(err as any).code = "over_email_send_rate_limit"
    expect(getFriendlySendError(err)).toContain("demasiados")
  })

  it("returns invalid email message for invalid email", () => {
    expect(getFriendlySendError(new Error("invalid email"))).toContain("válido")
  })

  it("returns invalid email message for not found", () => {
    expect(getFriendlySendError(new Error("email not found"))).toContain("válido")
  })

  it("returns generic message for unknown error", () => {
    expect(getFriendlySendError(new Error("network error"))).toContain("No fue posible")
  })

  it("returns generic message for non-Error input", () => {
    expect(getFriendlySendError("string error")).toContain("No fue posible")
  })

  it("returns generic message for null", () => {
    expect(getFriendlySendError(null)).toContain("No fue posible")
  })
})
