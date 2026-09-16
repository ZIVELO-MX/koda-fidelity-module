import { describe, expect, it } from "vitest"
import { CARD_ICONS, getCardIcon } from "../card-icons"

// `name` es lo que se guarda en la base. Renombrar o quitar uno deja sin ícono a
// las tarjetas ya publicadas con él, y eso no se ve hasta que alguien abre su
// tarjeta.
const NOMBRES_ANTERIORES = [
  "coffee",
  "utensils",
  "shopping-bag",
  "star",
  "crown",
  "stamp",
  "gift",
]

describe("catálogo de íconos", () => {
  it("conserva los nombres que ya estaban guardados en tarjetas", () => {
    for (const nombre of NOMBRES_ANTERIORES) {
      expect(getCardIcon(nombre), `desapareció el ícono "${nombre}"`).toBeDefined()
    }
  })

  it("no repite nombres, que se resolverían al primero y en silencio", () => {
    const nombres = CARD_ICONS.map((i) => i.name)
    expect(new Set(nombres).size).toBe(nombres.length)
  })

  it("da a cada ícono su etiqueta, su rubro y su componente", () => {
    for (const icono of CARD_ICONS) {
      expect(icono.label.trim(), icono.name).not.toBe("")
      expect(icono.grupo.trim(), icono.name).not.toBe("")
      expect(typeof icono.Icon, icono.name).toBe("object")
    }
  })

  // El rubro no se muestra, pero la búsqueda entra por él: escribir "farmacia"
  // trae sus íconos aunque ninguna etiqueta diga esa palabra.
  it("cubre los rubros de los temas de tarjeta de FID-0009", () => {
    const rubros = new Set(CARD_ICONS.map((i) => i.grupo))
    for (const rubro of ["Panadería", "Taquería", "Cafetería", "Farmacia", "Heladería"]) {
      expect(rubros, `falta el rubro ${rubro}`).toContain(rubro)
    }
  })

  it("no devuelve nada para un nombre que no existe", () => {
    expect(getCardIcon("no-existe")).toBeUndefined()
    expect(getCardIcon(null)).toBeUndefined()
  })
})
