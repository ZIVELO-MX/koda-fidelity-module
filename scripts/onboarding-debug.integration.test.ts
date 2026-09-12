import { describe, expect, it } from "vitest"
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const script = resolve(fileURLToPath(new URL(".", import.meta.url)), "onboarding-debug.ts")

function run(args: string[], env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, ["--import", "tsx", script, ...args], { env: { ...process.env, ...env }, encoding: "utf8" })
}

describe("onboarding debug command guard", () => {
  it("rejects production before touching Auth or Prisma", () => {
    const result = run(["status", "tester@invalid.dev"], { FID_DEBUG_AUTH: "true", NODE_ENV: "production" })
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/requestId:/)
  })

  it("rejects a non-debug domain with a correlated error", () => {
    const result = run(["status", "tester@example.com"], { FID_DEBUG_AUTH: "true", NODE_ENV: "development" })
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/@invalid\.dev/)
    expect(result.stderr).toMatch(/requestId:/)
  })
})
