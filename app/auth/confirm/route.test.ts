import { describe, expect, it } from "vitest"
import { resolveAuthRedirect } from "@/lib/auth-redirect"

describe("auth confirmation redirects", () => {
  const origin = "http://localhost:3000"

  it("sends recovery links to the password update screen", () => {
    const redirect = resolveAuthRedirect("recovery", null, origin)
    expect(redirect.pathname).toBe("/dashboard/update-password")
    expect(redirect.searchParams.get("reason")).toBe("recovery")
  })

  it("keeps magic links on the customer portal", () => {
    expect(resolveAuthRedirect("magiclink", null, origin).pathname).toBe("/dashboard/my-cards")
  })

  it("accepts same-origin paths and rejects external redirects", () => {
    const localRedirect = resolveAuthRedirect("recovery", "/dashboard/my-cards", origin)
    const externalRedirect = resolveAuthRedirect("recovery", "https://evil.example/phish", origin)
    expect(localRedirect.pathname).toBe("/dashboard/update-password")
    expect(localRedirect.searchParams.get("reason")).toBe("recovery")
    expect(externalRedirect.pathname).toBe("/dashboard/update-password")
    expect(externalRedirect.searchParams.get("reason")).toBe("recovery")
  })
})
