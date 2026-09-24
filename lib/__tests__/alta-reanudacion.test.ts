import { describe, it, expect } from "vitest"
import { enumerar, hayQueReanudar, loGuardado } from "../alta-reanudacion"
import type { EstadoDelAlta } from "../onboarding"

const VACIO: EstadoDelAlta = {
  step: "INTRO", status: "IN_PROGRESS", draftVersion: 1,
  negocio: {}, tarjeta: {},
  acquisitionSource: null, selectedBillingInterval: null, primeraTarjetaId: null,
  categorias: [], temas: [], modo: "live", plan: "LITE",
  nombreDeLaCuenta: null,
}

describe("lo que se puede afirmar que quedó guardado", () => {
  it("un alta recién empezada no anuncia que recuperó nada", () => {
    expect(loGuardado(VACIO)).toEqual([])
    expect(hayQueReanudar(VACIO)).toBe(false)
  })

  it("nombra solo los campos que existen, no los que faltan", () => {
    const estado = { ...VACIO, step: "CARD" as const, negocio: { name: "Café Aurora" } }
    expect(loGuardado(estado)).toEqual(["el nombre de tu negocio"])
    // Ni categoría, ni recompensa, ni sellos: no están.
    expect(loGuardado(estado)).not.toContain("su categoría")
  })

  it("una cadena en blanco no cuenta como dato guardado", () => {
    const estado = { ...VACIO, step: "BUSINESS" as const, negocio: { name: "   " } }
    expect(loGuardado(estado)).toEqual([])
    expect(hayQueReanudar(estado)).toBe(false)
  })

  it("cero sellos es un dato, no un hueco", () => {
    // `if (stampsRequired)` habría tratado el 0 como ausente. Es un número que
    // la persona eligió.
    const estado = { ...VACIO, step: "CARD" as const, tarjeta: { stampsRequired: 0 } }
    expect(loGuardado(estado)).toEqual(["cuántos sellos pides"])
  })

  it("en el paso de intro no se anuncia reanudación aunque haya datos", () => {
    const estado = { ...VACIO, negocio: { name: "Café Aurora" } }
    expect(hayQueReanudar(estado)).toBe(false)
  })

  it("enumera en español, sin coma antes de la y", () => {
    expect(enumerar([])).toBe("")
    expect(enumerar(["uno"])).toBe("uno")
    expect(enumerar(["uno", "dos"])).toBe("uno y dos")
    expect(enumerar(["uno", "dos", "tres"])).toBe("uno, dos y tres")
  })
})
