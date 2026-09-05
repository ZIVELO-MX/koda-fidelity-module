import { describe, expect, it } from "vitest"
import { inicioDelDia, inicioDelDiaAnterior } from "../dia-local"

describe("inicioDelDia", () => {
  it("corta el día en México, no en UTC", () => {
    // 04:00 UTC del 5 son las 22:00 del 4 en México: todavía es el día 4.
    expect(inicioDelDia(new Date("2026-09-05T04:00:00Z")).toISOString()).toBe(
      "2026-09-04T06:00:00.000Z",
    )
  })

  it("ya es el día siguiente pasada la medianoche local", () => {
    expect(inicioDelDia(new Date("2026-09-05T18:00:00Z")).toISOString()).toBe(
      "2026-09-05T06:00:00.000Z",
    )
  })

  it("es idempotente sobre su propio resultado", () => {
    const inicio = inicioDelDia(new Date("2026-09-05T18:00:00Z"))
    expect(inicioDelDia(inicio).toISOString()).toBe(inicio.toISOString())
  })

  it("respeta otra zona cuando se le pasa", () => {
    expect(inicioDelDia(new Date("2026-09-05T04:00:00Z"), "UTC").toISOString()).toBe(
      "2026-09-05T00:00:00.000Z",
    )
  })
})

describe("inicioDelDiaAnterior", () => {
  it("devuelve la medianoche local de ayer", () => {
    expect(inicioDelDiaAnterior(new Date("2026-09-05T18:00:00Z")).toISOString()).toBe(
      "2026-09-04T06:00:00.000Z",
    )
  })

  it("cruza el cambio de mes", () => {
    expect(inicioDelDiaAnterior(new Date("2026-09-01T18:00:00Z")).toISOString()).toBe(
      "2026-08-31T06:00:00.000Z",
    )
  })

  it("deja exactamente un día entre ayer y hoy", () => {
    const referencia = new Date("2026-09-05T18:00:00Z")
    const diferencia = inicioDelDia(referencia).getTime() - inicioDelDiaAnterior(referencia).getTime()
    expect(diferencia).toBe(24 * 60 * 60 * 1000)
  })
})
