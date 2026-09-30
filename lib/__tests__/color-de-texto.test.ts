import { describe, it, expect } from "vitest"
import { contraste } from "@/lib/color-marca"
import { pielDeTarjeta } from "@/lib/temas-de-tarjeta"

/**
 * El negocio puede forzar el texto de la tarjeta a negro o blanco. Lo decidido:
 * el texto siempre se lee, y lo que cede es el tono del fondo. Blanco sobre
 * ámbar no puede quedarse en 2.15:1.
 */
const PRESETS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"]
const ACABADOS = [null, "gradiente", "foil", "cinetico", "vidrio"]
const TINTA = "#1C1B17"
const BLANCO = "#FFFFFF"
const extremos = (fondo: string) => fondo.match(/#[0-9A-Fa-f]{6}/g) ?? []

describe("texto forzado", () => {
  for (const [modo, esperado] of [["DARK", TINTA], ["LIGHT", BLANCO]] as const) {
    for (const codigo of ACABADOS) {
      for (const color of PRESETS) {
        // Negro sobre «Gradiente vivo» no tiene tono posible: su extremo baja al
        // 50%, y ni con fondo blanco la tinta llega a 4.5. Ahí gana la lectura.
        const imposible = modo === "DARK" && codigo === "gradiente"
        it(`${modo} sobre ${color} en ${codigo ?? "Lite"} ${imposible ? "se lee igual y lo marca" : "usa ese texto"} y llega a AA`, () => {
          const piel = pielDeTarjeta(codigo, color, modo)
          expect(piel.colorDeTextoRespetado).toBe(!imposible)
          if (!imposible) expect(piel.texto).toBe(esperado)
          for (const punto of extremos(piel.fondo)) {
            expect(contraste(piel.texto, punto)).toBeGreaterThanOrEqual(4.5)
          }
        })
      }
    }
  }

  it("AUTO es lo de siempre: el parámetro no cambia a nadie que no lo pase", () => {
    for (const codigo of ACABADOS) for (const color of PRESETS) {
      expect(pielDeTarjeta(codigo, color, "AUTO")).toEqual(pielDeTarjeta(codigo, color))
    }
  })

  it("avisa cuando el tono se movió, y solo entonces", () => {
    // El ámbar lleva tinta de forma natural: forzarla no mueve nada.
    expect(pielDeTarjeta(null, "#f59e0b", "DARK").tonoAjustado).toBe(false)
    // Blanco sobre ámbar obliga a oscurecerlo.
    expect(pielDeTarjeta(null, "#f59e0b", "LIGHT").tonoAjustado).toBe(true)
  })
})
