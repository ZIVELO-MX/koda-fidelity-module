import { describe, it, expect, beforeEach } from "vitest"

function isInviteOnly() {
  return process.env.INVITE_ONLY !== "false"
}

describe("invite-only logic", () => {
  beforeEach(() => {
    delete process.env.INVITE_ONLY
  })

  it("defaults to true when env is not set", () => {
    expect(isInviteOnly()).toBe(true)
  })

  it("returns false when env is set to false", () => {
    process.env.INVITE_ONLY = "false"
    expect(isInviteOnly()).toBe(false)
  })

  it("returns true when env is set to true", () => {
    process.env.INVITE_ONLY = "true"
    expect(isInviteOnly()).toBe(true)
  })

  it("returns true when env is any non-false value", () => {
    process.env.INVITE_ONLY = "0"
    expect(isInviteOnly()).toBe(true)
    process.env.INVITE_ONLY = "yes"
    expect(isInviteOnly()).toBe(true)
    process.env.INVITE_ONLY = ""
    expect(isInviteOnly()).toBe(true)
  })
})
