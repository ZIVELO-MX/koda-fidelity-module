import { describe, expect, it } from "vitest"
import { parseDebugArgs } from "./onboarding-debug-args"

describe("onboarding debug arguments", () => {
  it.each(["status", "enable", "reset"])("accepts %s with the documented separator", (command) => {
    expect(parseDebugArgs(["--", command, "tester@invalid.dev"])).toEqual({ command, email: "tester@invalid.dev" })
  })

  it("normalizes the supported domain case-insensitively", () => {
    expect(parseDebugArgs(["status", "Tester@INVALID.DEV"]).email).toBe("Tester@INVALID.DEV")
  })

  it("rejects non-debug accounts and unknown commands", () => {
    expect(() => parseDebugArgs(["status", "tester@example.com"])).toThrow("@invalid.dev")
    expect(() => parseDebugArgs(["delete", "tester@invalid.dev"])).toThrow("Usage")
  })
})
