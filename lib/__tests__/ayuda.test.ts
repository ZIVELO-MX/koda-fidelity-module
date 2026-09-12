import { describe, it, expect } from "vitest"
import { TEMAS, temaDe } from "../ayuda"

describe("temaDe", () => {
  it("da el tema exacto de la pantalla", () => {
    expect(temaDe("/dashboard/team")?.titulo).toBe("Equipo")
    expect(temaDe("/dashboard")?.titulo).toBe("Panel")
  })

  it("gana el prefijo más largo, no el primero que case", () => {
    // `/dashboard` casa con todo lo que cuelga de él. Una subruta tiene que
    // caer en su propia pantalla.
    expect(temaDe("/dashboard/cards/nueva")?.titulo).toBe("Tarjetas")
    expect(temaDe("/dashboard/qr-codes/abc/preview")?.titulo).toBe("Códigos QR")
  })

  it("no confunde rutas que solo comparten el principio del nombre", () => {
    expect(temaDe("/dashboard/cards-archivadas")?.titulo).toBe("Panel")
  })

  it("se queda sin tema fuera del panel", () => {
    expect(temaDe("/login")).toBeUndefined()
  })

  it("no repite rutas", () => {
    const rutas = TEMAS.map((t) => t.ruta)
    expect(new Set(rutas).size).toBe(rutas.length)
  })
})
