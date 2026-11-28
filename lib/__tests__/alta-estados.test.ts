import { describe, it, expect } from "vitest"
import { mensajeDeAlta, motivoNoDisponible } from "../alta-estados"

describe("estados públicos de alta", () => {
  it.each(["ARCHIVED", "LOCKED_BY_PLAN"])("usa el mismo mensaje discreto para %s", status => {
    const motivo = motivoNoDisponible({ isActive: false, status, expiresAt: null })
    expect(motivo).toBe("no-disponible")
    expect(mensajeDeAlta(motivo!).titulo).toBe("Esta tarjeta no está disponible")
    expect(mensajeDeAlta(motivo!).accion.href).toBe("/my-cards")
  })

  it("comunica que una tarjeta vencida puede volver a estar disponible", () => {
    expect(motivoNoDisponible({ isActive: true, status: "ACTIVE", expiresAt: "2020-01-01" })).toBe("vencida")
    expect(mensajeDeAlta("vencida").titulo).toBe("Esta tarjeta no está disponible por ahora")
    expect(mensajeDeAlta("vencida").accion.href).toBe("/my-cards")
  })

  it("distingue el enlace inexistente de una falla transitoria", () => {
    expect(mensajeDeAlta("no-encontrada").accion.href).toBe("/")
    expect(mensajeDeAlta("sin-conexion").accion.texto).toBe("Reintentar")
    expect(motivoNoDisponible({ isActive: true, status: "ACTIVE", expiresAt: null })).toBeNull()
  })
})
