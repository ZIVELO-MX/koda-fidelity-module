import { describe, it, expect } from "vitest"
import { ORIGENES } from "../onboarding"

/**
 * El catálogo acordado en `plans/2026-09-20-fidelity/design.md`: Koda POS,
 * recomendación, redes sociales, búsqueda, evento y otro.
 *
 * Se fija aquí porque es medición: si alguien añade o quita una opción sin
 * acordarlo, los números dejan de ser comparables con los de antes y nadie se
 * entera hasta que ya pasó.
 */
const ACORDADO = ["KODA_POS", "REFERRAL", "SOCIAL", "SEARCH", "EVENT", "OTHER"]

describe("el catálogo de atribución", () => {
  it("son exactamente las seis opciones acordadas", () => {
    expect([...ORIGENES.map((o) => o.valor)].sort()).toEqual([...ACORDADO].sort())
  })

  it("cada opción se puede leer sin conocer su código", () => {
    for (const origen of ORIGENES) {
      expect(origen.etiqueta.trim().length, origen.valor).toBeGreaterThan(3)
      expect(origen.etiqueta, origen.valor).not.toBe(origen.valor)
    }
  })

  it("no hay etiquetas repetidas, que harían ambigua la respuesta", () => {
    const etiquetas = ORIGENES.map((o) => o.etiqueta)
    expect(new Set(etiquetas).size).toBe(etiquetas.length)
  })

  it("«Otro» va al final: es la salida, no una opción más", () => {
    expect(ORIGENES[ORIGENES.length - 1].valor).toBe("OTHER")
  })
})
