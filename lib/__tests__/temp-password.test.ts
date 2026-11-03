import { describe, expect, it } from "vitest"
import { generateTempPassword } from "../temp-password"
import { cumpleLasReglas } from "../reglas-de-contrasena"

describe("generateTempPassword", () => {
  it("genera una contraseña larga que cumple las reglas", () => {
    const clave = generateTempPassword()
    expect(clave.length).toBeGreaterThanOrEqual(12)
    expect(clave).toMatch(/^Koda-[A-Za-z0-9_-]+$/)
    expect(cumpleLasReglas(clave)).toBe(true)
  })

  it("no repite la contraseña", () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword())
  })
})
