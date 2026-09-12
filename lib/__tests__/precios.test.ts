import { describe, it, expect } from "vitest"
import { cuentaDelAnual } from "../precios"

// Los importes confirmados del ciclo: Lite 149 y 1,490; Pro 299 y 2,990.
const PLANES = [
  { nombre: "Lite", mensual: 149, anual: 1490 },
  { nombre: "Pro", mensual: 299, anual: 2990 },
]

describe("cuentaDelAnual", () => {
  it("el tachado es el año pagando mes a mes, no un precio inventado", () => {
    expect(cuentaDelAnual(149, 1490).doceMeses).toBe(1788)
    expect(cuentaDelAnual(299, 2990).doceMeses).toBe(3588)
  })

  it("el ahorro es exactamente dos meses, que es lo que promete el selector", () => {
    for (const plan of PLANES) {
      const { ahorro } = cuentaDelAnual(plan.mensual, plan.anual)
      expect(ahorro, plan.nombre).toBe(plan.mensual * 2)
    }
  })

  it("el mes pagando por año sale por debajo del mensual", () => {
    expect(cuentaDelAnual(149, 1490).porMes).toBe(124)
    expect(cuentaDelAnual(299, 2990).porMes).toBe(249)
  })

  it("el anual nunca sale más caro que pagar mes a mes", () => {
    for (const plan of PLANES) {
      const { doceMeses } = cuentaDelAnual(plan.mensual, plan.anual)
      expect(plan.anual, plan.nombre).toBeLessThan(doceMeses)
    }
  })
})
