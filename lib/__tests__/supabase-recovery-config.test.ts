import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("local recovery mail contract", () => {
  it("pins the one-hour OTP and application confirmation template", () => {
    const config = readFileSync(resolve(process.cwd(), "supabase/config.toml"), "utf8")
    const template = readFileSync(resolve(process.cwd(), "supabase/templates/recovery.html"), "utf8")
    expect(config).toContain("otp_expiry = 3600")
    expect(config).toContain("content_path = \"./supabase/templates/recovery.html\"")
    expect(template).toContain("/auth/confirm?token_hash={{ .TokenHash }}&type=recovery")
  })
})
