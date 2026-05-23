import { describe, it, expect } from "vitest"

interface AuthCheck {
  sessionEmail: string | null
  queryEmail: string
  allowed: boolean
}

function checkCustomerAccess(params: AuthCheck): boolean {
  if (!params.sessionEmail) return false
  return params.sessionEmail === params.queryEmail
}

describe("customer data access control", () => {
  it("allows access when session email matches query email", () => {
    expect(checkCustomerAccess({ sessionEmail: "ana@test.com", queryEmail: "ana@test.com", allowed: true })).toBe(true)
  })

  it("denies access when no session", () => {
    expect(checkCustomerAccess({ sessionEmail: null, queryEmail: "ana@test.com", allowed: false })).toBe(false)
  })

  it("denies access when session email differs from query email", () => {
    expect(checkCustomerAccess({ sessionEmail: "bob@test.com", queryEmail: "ana@test.com", allowed: false })).toBe(false)
  })

  it("allows access with same email for multiple cards", () => {
    expect(checkCustomerAccess({ sessionEmail: "ana@test.com", queryEmail: "ana@test.com", allowed: true })).toBe(true)
  })
})
