import { describe, it, expect, beforeEach } from "vitest"

function isInviteOnly() {
  return process.env.INVITE_ONLY === "true"
}

describe("invite-only logic", () => {
  beforeEach(() => {
    delete process.env.INVITE_ONLY
  })

  it("defaults to open registration when env is not set", () => {
    expect(isInviteOnly()).toBe(false)
  })

  it("returns false when env is set to false", () => {
    process.env.INVITE_ONLY = "false"
    expect(isInviteOnly()).toBe(false)
  })

  it("returns true when env is set to true", () => {
    process.env.INVITE_ONLY = "true"
    expect(isInviteOnly()).toBe(true)
  })

  it("only enables invite-only mode for explicit true", () => {
    process.env.INVITE_ONLY = "0"
    expect(isInviteOnly()).toBe(false)
    process.env.INVITE_ONLY = "yes"
    expect(isInviteOnly()).toBe(false)
    process.env.INVITE_ONLY = ""
    expect(isInviteOnly()).toBe(false)
  })
})
