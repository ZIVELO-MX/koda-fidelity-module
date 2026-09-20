import { describe, expect, it } from "vitest"
import { parseDebugArgs } from "./onboarding-debug-args"

describe("onboarding debug arguments", () => {
  it.each(["status", "enable", "reset"])("accepts %s with the documented separator", (command) => {
    expect(parseDebugArgs(["--", command, "tester@dev.invalid"])).toEqual({ command, email: "tester@dev.invalid" })
  })

  it("normalizes the supported domain case-insensitively", () => {
    expect(parseDebugArgs(["status", "Tester@DEV.INVALID"]).email).toBe("Tester@DEV.INVALID")
  })

  it("rejects non-debug accounts and unknown commands", () => {
    expect(() => parseDebugArgs(["status", "tester@example.com"])).toThrow("@dev.invalid")
    expect(() => parseDebugArgs(["status", "tester@invalid.dev"])).toThrow("@dev.invalid")
    expect(() => parseDebugArgs(["delete", "tester@dev.invalid"])).toThrow("Usage")
  })
})
