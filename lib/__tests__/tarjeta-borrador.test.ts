import { describe, expect, it } from "vitest"
import { sorpresasQueViajan, validarBorrador, type Borrador } from "../tarjeta-borrador"

function borrador(cambios: Partial<Borrador> = {}): Borrador {
  return {
    nombre: "Café Reward",
    recompensa: "Un café gratis",
    sellosRequeridos: 10,
    sorpresas: [],
    ...cambios,
  }
}

function sorpresa(cambios: Partial<Borrador["sorpresas"][number]> = {}) {
  return { stampNumber: 3, label: "Postre gratis", iconName: null, probability: 50, ...cambios }
}

describe("sorpresasQueViajan", () => {
  it("deja pasar una sorpresa con etiqueta", () => {
    expect(sorpresasQueViajan([sorpresa()])).toHaveLength(1)
  })

  it("descarta la que no tiene etiqueta", () => {
    expect(sorpresasQueViajan([sorpresa({ label: "" })])).toEqual([])
  })

  it("descarta la que solo tiene espacios", () => {
    expect(sorpresasQueViajan([sorpresa({ label: "   " })])).toEqual([])
  })

  it("recorta los espacios de la etiqueta que sí viaja", () => {
    expect(sorpresasQueViajan([sorpresa({ label: "  Postre gratis  " })])[0].label).toBe(
      "Postre gratis",
    )
  })

  it("conserva el resto de los campos", () => {
    const [enviada] = sorpresasQueViajan([sorpresa({ stampNumber: 7, probability: 15, iconName: "gift" })])
    expect(enviada).toEqual({ stampNumber: 7, label: "Postre gratis", iconName: "gift", probability: 15 })
  })
})

describe("validarBorrador", () => {
  it("acepta un borrador correcto", () => {
    const r = validarBorrador(borrador({ sorpresas: [sorpresa()] }))
    expect(r.errores).toEqual({})
    expect(r.primerCampo).toBeNull()
  })

  it("exige el nombre", () => {
    const r = validarBorrador(borrador({ nombre: "  " }))
    expect(r.errores.nombre).toBeTruthy()
    expect(r.primerCampo).toBe("nombre")
  })

  it("exige la recompensa", () => {
    const r = validarBorrador(borrador({ recompensa: "" }))
    expect(r.errores.recompensa).toBeTruthy()
    expect(r.primerCampo).toBe("recompensa")
  })

  // El foco va al primer campo inválido *de la pantalla*, y ahí la recompensa
  // va antes que el nombre.
  it("señala la recompensa antes que el nombre cuando faltan los dos", () => {
    const r = validarBorrador(borrador({ nombre: "", recompensa: "" }))
    expect(r.primerCampo).toBe("recompensa")
  })

  it("rechaza una sorpresa fuera del rango de sellos", () => {
    const r = validarBorrador(borrador({ sellosRequeridos: 5, sorpresas: [sorpresa({ stampNumber: 6 })] }))
    expect(r.errores["sorpresa-0"]).toBeTruthy()
    expect(r.primerCampo).toBe("sorpresa-0")
  })

  it("rechaza una sorpresa en el sello cero", () => {
    const r = validarBorrador(borrador({ sorpresas: [sorpresa({ stampNumber: 0 })] }))
    expect(r.errores["sorpresa-0"]).toBeTruthy()
  })

  it("rechaza dos sorpresas en el mismo sello", () => {
    const r = validarBorrador(
      borrador({ sorpresas: [sorpresa({ stampNumber: 3 }), sorpresa({ stampNumber: 3 })] }),
    )
    expect(r.errores["sorpresa-1"]).toMatch(/mismo sello|repetid/i)
  })

  it("no se queja de una sorpresa sin etiqueta, porque esa no viaja", () => {
    const r = validarBorrador(borrador({ sorpresas: [sorpresa({ label: "" })] }))
    expect(r.errores).toEqual({})
  })

  it("exige al menos un sello", () => {
    const r = validarBorrador(borrador({ sellosRequeridos: 0 }))
    expect(r.errores.sellosRequeridos).toBeTruthy()
  })
})
