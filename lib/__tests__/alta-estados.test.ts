import { describe, it, expect } from "vitest"
import { mensajeDeAlta, type MotivoAlta } from "../alta-estados"

const MOTIVOS: MotivoAlta[] = ["no-encontrada", "vencida", "cerrada"]

describe("mensajeDeAlta", () => {
  it("no repite el título entre motivos", () => {
    // La regresión que arregla: los tres decían "Tarjeta no encontrada".
    const titulos = MOTIVOS.map((m) => mensajeDeAlta(m).titulo)
    expect(new Set(titulos).size).toBe(MOTIVOS.length)
  })

  it("manda a las tarjetas propias cuando la persona ya podía tener sellos", () => {
    expect(mensajeDeAlta("vencida").accion.href).toBe("/my-cards")
    expect(mensajeDeAlta("cerrada").accion.href).toBe("/my-cards")
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
