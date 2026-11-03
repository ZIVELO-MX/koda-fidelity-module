import { describe, expect, it } from "vitest"
import { buildHtml } from "./invite-email"

describe("correo de credenciales", () => {
  // `replace` con un texto interpreta `$$` y `$&`: el correo decía «Pa$word1»
  // y la cuenta tenía «Pa$$word1».
  it("pone la contraseña tal cual, aunque lleve $", () => {
    expect(buildHtml("Ana", "ana@test.invalid", "Pa$$word1&$'")).toContain("Pa$$word1&$'")
  })
})

