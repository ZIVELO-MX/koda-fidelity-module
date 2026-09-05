import { describe, expect, it } from "vitest"
import { classifyLoginError } from "@/lib/auth-errors"

describe("classifyLoginError", () => {
  it("classifies invalid credentials without exposing provider details", () => {
    expect(classifyLoginError(Object.assign(new Error("Invalid login credentials"), { code: "invalid_credentials", status: 400 }))).toBe("invalid_credentials")
  })

  it("classifies application and provider rate limits", () => {
    expect(classifyLoginError(new Error("RATE_LIMITED"))).toBe("rate_limited")
    expect(classifyLoginError({ code: "too_many_requests", status: 429 })).toBe("rate_limited")
  })

  it("classifies missing tables and unknown errors as infrastructure failures", () => {
    expect(classifyLoginError(new Error("The table AuthRateLimit does not exist"))).toBe("infrastructure")
    expect(classifyLoginError(new Error("unexpected database failure"))).toBe("infrastructure")
  })
})
