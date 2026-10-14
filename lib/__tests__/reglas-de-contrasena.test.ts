import { describe, expect, it } from "vitest"
import { REGLAS_DE_CONTRASENA, cumpleLasReglas, reglaQueFalta } from "@/lib/reglas-de-contrasena"

describe("reglas de contraseña", () => {
  it("son las mismas tres para todas las puertas", () => {
    expect(REGLAS_DE_CONTRASENA.map((r) => r.etiqueta)).toEqual([
      "Mínimo 8 caracteres",
      "Una letra mayúscula (A–Z)",
      "Un carácter especial (!@#$%...)",
    ])
  })

  it("acepta una contraseña que cumple las tres", () => {
    expect(cumpleLasReglas("Password1!")).toBe(true)
    expect(reglaQueFalta("Password1!")).toBeNull()
  })

  it("ocho caracteres sin mayúscula ni símbolo ya no pasan por la segunda puerta", () => {
    // Era exactamente lo que aceptaba la pantalla de cambio: solo longitud.
    expect(cumpleLasReglas("contrasena")).toBe(false)
    expect(reglaQueFalta("contrasena")).toBe("Una letra mayúscula (A–Z)")
  })

  it("nombra la primera regla que falta, en orden", () => {
    expect(reglaQueFalta("")).toBe("Mínimo 8 caracteres")
    expect(reglaQueFalta("Corta1!")).toBe("Mínimo 8 caracteres")
    expect(reglaQueFalta("Passwordlarga")).toBe("Un carácter especial (!@#$%...)")
  })
})
