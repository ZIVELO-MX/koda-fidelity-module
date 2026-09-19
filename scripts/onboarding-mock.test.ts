import { describe, expect, it } from "vitest"
import { parseMockArgs } from "./onboarding-mock"

describe("onboarding mock arguments", () => {
  it("accepts an email and optional port", () => {
    expect(parseMockArgs(["--", "tester@dev.invalid", "--port", "3100"])).toEqual({ email: "tester@dev.invalid", port: 3100 })
  })

  it("normalizes email and rejects invalid ports", () => {
    expect(parseMockArgs(["Tester@DEV.INVALID"])).toEqual({ email: "tester@dev.invalid", port: 3000 })
    expect(() => parseMockArgs(["tester@dev.invalid", "--port", "70000"])).toThrow("puerto")
  })
})
