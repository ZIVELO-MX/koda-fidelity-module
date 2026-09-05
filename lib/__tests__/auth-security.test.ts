import { beforeEach, describe, expect, it } from "vitest"
import { createInvitationToken, invitationTokenHash, normalizeEmail } from "@/lib/auth-security"

describe("auth security", () => {
  beforeEach(() => { process.env.AUTH_SECURITY_SECRET = "test-secret-with-at-least-thirty-two-bytes" })

  it("normalizes email identity", () => expect(normalizeEmail(" User@Example.COM ")).toBe("user@example.com"))

  it("signs invitation tokens without persisting the raw token", () => {
    const invitation = createInvitationToken()
    expect(invitation.tokenHash).not.toContain(invitation.token)
    expect(invitationTokenHash(invitation.token)).toBe(invitation.tokenHash)
  })

  it("rejects altered invitation tokens", () => {
    const { token } = createInvitationToken()
    expect(invitationTokenHash(`${token}x`)).toBeNull()
  })
})
