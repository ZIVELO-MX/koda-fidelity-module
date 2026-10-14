import { describe, expect, it } from "vitest"
import { exigirBaseLocal } from "./onboarding-e2e-guard"

const local = {
  ALLOW_DESTRUCTIVE_SEED: "true",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:55432/postgres",
  DIRECT_URL: "postgresql://postgres:postgres@127.0.0.1:55432/postgres",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
}

describe("prepare:onboarding-e2e", () => {
  it("acepta solo el fixture local habilitado explícitamente", () => {
    expect(() => exigirBaseLocal(local)).not.toThrow()
    expect(() => exigirBaseLocal({ ...local, ALLOW_DESTRUCTIVE_SEED: "false" }))
      .toThrow("El fixture exige ALLOW_DESTRUCTIVE_SEED=true")
  })

  it.each(["DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL"] as const)(
    "rechaza %s remoto antes de acceder a la base",
    (variable) => {
      const remota = variable === "NEXT_PUBLIC_SUPABASE_URL"
        ? "https://shared.supabase.co"
        : "postgresql://postgres:postgres@db.shared.example:6543/postgres"
      expect(() => exigirBaseLocal({ ...local, [variable]: remota }))
        .toThrow(`El fixture rechaza ${variable} fuera de localhost`)
    },
  )
})
