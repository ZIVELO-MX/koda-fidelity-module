import { describe, it, expect } from "vitest"
import { mensajeDeAlta, type MotivoAlta } from "../alta-estados"

const MOTIVOS: MotivoAlta[] = ["no-encontrada", "vencida", "cerrada", "desactivada"]

describe("mensajeDeAlta", () => {
  it("no repite el título entre motivos", () => {
    // La regresión que arregla: los tres decían "Tarjeta no encontrada".
    const titulos = MOTIVOS.map((m) => mensajeDeAlta(m).titulo)
    expect(new Set(titulos).size).toBe(MOTIVOS.length)
  })

  it("manda a las tarjetas propias cuando la persona ya podía tener sellos", () => {
    expect(mensajeDeAlta("vencida").accion.href).toBe("/my-cards")
    expect(mensajeDeAlta("cerrada").accion.href).toBe("/my-cards")
    expect(mensajeDeAlta("desactivada").accion.href).toBe("/my-cards")
  })

  it("la desactivación por plan avisa, no alarma, y dice que los sellos siguen", () => {
    const mensaje = mensajeDeAlta("desactivada")
    // Ámbar, no rojo: la tarjeta no está rota y quien la escanea no tiene nada
    // que ver con el plan del negocio.
    expect(mensaje.tono).toBe("aviso")
    expect(mensaje.detalle).toMatch(/siguen guardados/i)
    // Sin culpar a nadie ni pedir algo que el cliente no puede hacer.
    expect(mensaje.detalle).not.toMatch(/error|tu culpa|inténtalo de nuevo/i)
  })

  it("solo la desactivación lleva tono de aviso", () => {
    for (const motivo of MOTIVOS.filter((m) => m !== "desactivada")) {
      expect(mensajeDeAlta(motivo).tono, motivo).toBeUndefined()
    }
  })

  it("manda al inicio cuando la tarjeta nunca existió", () => {
    expect(mensajeDeAlta("no-encontrada").accion.href).toBe("/")
  })

  it("cada motivo dice qué hacer", () => {
    for (const motivo of MOTIVOS) {
      const mensaje = mensajeDeAlta(motivo)
      expect(mensaje.detalle.length, motivo).toBeGreaterThan(40)
      expect(mensaje.accion.texto.length, motivo).toBeGreaterThan(0)
      expect(mensaje.titulo, motivo).not.toContain("—")
    }
  })
})
