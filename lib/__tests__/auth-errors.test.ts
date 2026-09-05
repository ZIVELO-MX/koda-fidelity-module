import { describe, it, expect } from "vitest"
import { classifyLoginError, getFriendlyAuthError, getFriendlySendError } from "../auth-errors"

describe("getFriendlyAuthError", () => {
  it("returns expired error for otp_expired code", () => {
    const result = getFriendlyAuthError("", "otp_expired")
    expect(result).not.toBeNull()
    expect(result!.title).toBe("Enlace Expirado")
    expect(result!.description).toContain("válido")
  })
  it("returns expired error when message contains expired", () => expect(getFriendlyAuthError("Email link is invalid or has expired", "")?.title).toBe("Enlace Expirado"))
  it("returns rate limit error for rate_limit code", () => expect(getFriendlyAuthError("", "rate_limit")?.title).toBe("Demasiados Intentos"))
  it("returns rate limit error when message contains rate_limit", () => expect(getFriendlyAuthError("over_email_send_rate_limit", "")?.title).toBe("Demasiados Intentos"))
  it("returns rate limit error when message contains rate limit with space", () => expect(getFriendlyAuthError("email rate limit exceeded", "")?.title).toBe("Demasiados Intentos"))
  it("returns invalid link error for invalid token", () => expect(getFriendlyAuthError("Invalid token", "")?.title).toBe("Enlace No Válido"))
  it("returns invalid link error for not found", () => expect(getFriendlyAuthError("Token not found", "")?.title).toBe("Enlace No Válido"))
  it("returns email not confirmed error", () => expect(getFriendlyAuthError("Email not confirmed", "")?.title).toBe("Correo No Confirmado"))
  it("returns null for unknown errors", () => expect(getFriendlyAuthError("Some random error", "")).toBeNull())
  it("returns null for empty strings", () => expect(getFriendlyAuthError("", "")).toBeNull())
})

describe("getFriendlySendError", () => {
  it("returns rate limit message for rate_limit error", () => expect(getFriendlySendError(new Error("rate_limit exceeded"))).toContain("Google"))
  it("returns rate limit message for over_email_send_rate_limit", () => expect(getFriendlySendError(new Error("over_email_send_rate_limit"))).toContain("Google"))
  it("returns rate limit message for email rate limit exceeded", () => expect(getFriendlySendError(new Error("email rate limit exceeded"))).toContain("Google"))
  it("returns rate limit message for matching code", () => { const err = Object.assign(new Error("some other message"), { code: "over_email_send_rate_limit" }); expect(getFriendlySendError(err)).toContain("Google") })
  it("returns invalid email message for invalid email", () => expect(getFriendlySendError(new Error("invalid email"))).toContain("válido"))
  it("returns invalid email message for not found", () => expect(getFriendlySendError(new Error("email not found"))).toContain("válido"))
  it("returns generic message for unknown errors", () => expect(getFriendlySendError(new Error("network error"))).toContain("No fue posible"))
  it("returns generic message for non-Error input", () => expect(getFriendlySendError("string error")).toContain("No fue posible"))
  it("returns generic message for null", () => expect(getFriendlySendError(null)).toContain("No fue posible"))
})

describe("classifyLoginError", () => {
  it("classifies invalid credentials", () => {
    expect(classifyLoginError(Object.assign(new Error("Invalid login credentials"), { code: "invalid_credentials", status: 400 }))).toBe("invalid_credentials")
  })
  it("classifies application and provider rate limits", () => {
    expect(classifyLoginError(new Error("RATE_LIMITED"))).toBe("rate_limited")
    expect(classifyLoginError({ code: "too_many_requests", status: 429 })).toBe("rate_limited")
  })
  it("classifies missing tables and unknown errors as infrastructure", () => {
    expect(classifyLoginError(new Error("The table AuthRateLimit does not exist"))).toBe("infrastructure")
    expect(classifyLoginError(new Error("unexpected database failure"))).toBe("infrastructure")
  })
})
