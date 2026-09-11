import { describe, expect, it } from "vitest"
import { resolveAuthRedirect } from "@/lib/auth-redirect"

describe("auth confirmation redirects", () => {
  const origin = "http://localhost:3000"

  it("sends recovery links to the password update screen", () => {
    expect(resolveAuthRedirect("recovery", null, origin).pathname).toBe("/dashboard/update-password")
  })

  it("keeps magic links on the customer portal", () => {
    expect(resolveAuthRedirect("magiclink", null, origin).pathname).toBe("/dashboard/my-cards")
  })

  it("accepts same-origin paths and rejects external redirects", () => {
    expect(resolveAuthRedirect("recovery", "/dashboard/my-cards", origin).pathname).toBe("/dashboard/update-password")
    expect(resolveAuthRedirect("recovery", "https://evil.example/phish", origin).pathname).toBe("/dashboard/update-password")
  })
})
