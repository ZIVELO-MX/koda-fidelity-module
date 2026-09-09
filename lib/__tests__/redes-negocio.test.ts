import { describe, it, expect } from "vitest"
import { redesDelNegocio } from "../redes-negocio"

describe("redesDelNegocio", () => {
  it("no pinta nada mientras la API no mande los campos", () => {
    // Es el estado de hoy: la consulta pública devuelve solo cuatro campos.
    expect(redesDelNegocio({})).toEqual([])
    expect(redesDelNegocio(null)).toEqual([])
    expect(redesDelNegocio({ website: null, instagram: null })).toEqual([])
    expect(redesDelNegocio({ website: "  ", instagram: "" })).toEqual([])
  })

  it("completa el esquema que la gente no escribe", () => {
    expect(redesDelNegocio({ website: "minegocio.com" })[0].url).toBe("https://minegocio.com/")
    expect(redesDelNegocio({ website: "http://minegocio.com" })[0].url).toBe("http://minegocio.com/")
  })

  it("acepta el instagram como perfil, como dominio o como usuario", () => {
    const esperado = "https://instagram.com/kodapos"
    for (const escrito of [
      "@kodapos",
      "kodapos",
      "instagram.com/kodapos",
      "https://www.instagram.com/kodapos/",
      "https://instagram.com/kodapos?hl=es",
    ]) {
      expect(redesDelNegocio({ instagram: escrito })[0]?.url, escrito).toBe(esperado)
    }
  })

  it("no convierte en enlace lo que no es http", () => {
    // El negocio escribe estos campos y se muestran a sus clientes.
    expect(redesDelNegocio({ website: "javascript:alert(1)" })).toEqual([])
    expect(redesDelNegocio({ website: "data:text/html,<script>" })).toEqual([])
    expect(redesDelNegocio({ instagram: "javascript:alert(1)" })).toEqual([])
  })

  it("descarta usuarios de instagram imposibles", () => {
    expect(redesDelNegocio({ instagram: "no válido!" })).toEqual([])
    expect(redesDelNegocio({ instagram: "a".repeat(31) })).toEqual([])
  })

  it("da los dos, en orden estable", () => {
    const redes = redesDelNegocio({ website: "minegocio.com", instagram: "@kodapos" })
    expect(redes.map((r) => r.clave)).toEqual(["website", "instagram"])
  })
})
