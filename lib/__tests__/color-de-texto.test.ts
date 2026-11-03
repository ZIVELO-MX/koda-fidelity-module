import { describe, it, expect } from "vitest"
import { pielDeTarjeta } from "@/lib/temas-de-tarjeta"

/** El texto elegido no modifica la piel, incluso cuando queda con poco contraste. */
const PRESETS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"]
const ACABADOS = [null, "gradiente", "foil", "cinetico", "vidrio"]
const TINTA = "#1C1B17"
const BLANCO = "#FFFFFF"

describe("texto forzado", () => {
  for (const [modo, esperado] of [["DARK", TINTA], ["LIGHT", BLANCO]] as const) {
    for (const codigo of ACABADOS) {
      for (const color of PRESETS) {
        it(`${modo} sobre ${color} en ${codigo ?? "Lite"} conserva el fondo y usa ese texto`, () => {
          const piel = pielDeTarjeta(codigo, color, modo)
          expect(piel.texto).toBe(esperado)
          expect(piel.fondo).toBe(pielDeTarjeta(codigo, color, modo === "LIGHT" ? "DARK" : "LIGHT").fondo)
          expect(piel.tonoAjustado).toBe(false)
        })
      }
    }
  }

  it("AUTO es lo de siempre: el parámetro no cambia a nadie que no lo pase", () => {
    for (const codigo of ACABADOS) for (const color of PRESETS) {
      expect(pielDeTarjeta(codigo, color, "AUTO")).toEqual(pielDeTarjeta(codigo, color))
    }
  })

  it("no ajusta el tono al forzar el texto", () => {
    expect(pielDeTarjeta(null, "#f59e0b", "DARK").tonoAjustado).toBe(false)
    expect(pielDeTarjeta(null, "#f59e0b", "LIGHT").tonoAjustado).toBe(false)
  })
})
