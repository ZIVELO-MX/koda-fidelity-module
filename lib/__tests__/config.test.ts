import { describe, it, expect, beforeEach, vi } from "vitest"
import { config } from "../config"

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

describe("debug auth config", () => {
  beforeEach(() => {
    delete process.env.FID_DEBUG_AUTH
    delete process.env.VERCEL_ENV
    vi.stubEnv("NODE_ENV", "development")
  })

  it("allows only invalid.dev when explicitly enabled", () => {
    process.env.FID_DEBUG_AUTH = "true"
    expect(config.isDebugEmail("tester@invalid.dev")).toBe(true)
    expect(config.isDebugEmail("tester@example.com")).toBe(false)
  })

  it("allows preview but never production", () => {
    process.env.FID_DEBUG_AUTH = "true"
    vi.stubEnv("NODE_ENV", "production")
    process.env.VERCEL_ENV = "preview"
    expect(config.isDebugEmail("tester@invalid.dev")).toBe(true)
    process.env.VERCEL_ENV = "production"
    expect(config.isDebugEmail("tester@invalid.dev")).toBe(false)
  })
})
