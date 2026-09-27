import { describe, it, expect } from "vitest"
import { cuentaDelAnual, mesesGratisExactos, pesos } from "../precios"
import { PLANES } from "../planes"

// Los importes salen de `lib/planes.ts`, que es la fuente que también usan la
// sección de precios, el JSON-LD y llms.txt. Copiarlos aquí dejaría que la
// prueba siguiera en verde con un precio ya cambiado.

describe("cuentaDelAnual", () => {
  it("el año mes a mes es 12 mensualidades, no un precio inventado", () => {
    for (const plan of PLANES) {
      expect(cuentaDelAnual(plan.mensual, plan.anual).doceMeses, plan.nombre).toBe(plan.mensual * 12)
    }
  })

  it("el anual nunca sale más caro que pagar mes a mes", () => {
    for (const plan of PLANES) {
      const { doceMeses } = cuentaDelAnual(plan.mensual, plan.anual)
      expect(plan.anual, plan.nombre).toBeLessThan(doceMeses)
    }
  })

  it("el mes pagando por año sale por debajo del mensual", () => {
    for (const plan of PLANES) {
      const { porMes } = cuentaDelAnual(plan.mensual, plan.anual)
      expect(porMes, plan.nombre).toBeLessThan(plan.mensual)
    }
  })

  it("el equivalente mensual no se redondea hacia abajo", () => {
    // 1490 entre doce da 124.1666..., y 124 al mes serían 1488 al año: dos
    // pesos menos de los que se cobran. La cifra sale exacta y se formatea.
    const lite = cuentaDelAnual(149, 1490)
    expect(lite.porMes * 12).toBeCloseTo(1490, 10)
    expect(pesos(lite.porMes)).toBe("124.17")
    expect(pesos(cuentaDelAnual(299, 2990).porMes)).toBe("249.17")
  })

  it("los meses gratis salen de los importes y cuadran exactos en los dos planes", () => {
    for (const plan of PLANES) {
      const { ahorro } = cuentaDelAnual(plan.mensual, plan.anual)
      expect(ahorro, plan.nombre).toBe(plan.mensual * 2)
      expect(mesesGratisExactos(plan.mensual, plan.anual), plan.nombre).toBe(2)
    }
  })

  it("si el ahorro no da mensualidades enteras, no se promete ningún mes gratis", () => {
    // 100 al mes y 1050 al año ahorran 150: mes y medio. No se redondea a "un
    // mes gratis" ni a dos.
    expect(mesesGratisExactos(100, 1050)).toBeNull()
  })

  it("los centavos solo aparecen cuando existen", () => {
    expect(pesos(1490)).toBe("1,490")
    expect(pesos(124.1666)).toBe("124.17")
  })
})
