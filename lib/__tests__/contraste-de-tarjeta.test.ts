import { describe, expect, it } from "vitest"
import { contraste, mezclar } from "@/lib/color-marca"
import { pielDeTarjeta } from "@/lib/temas-de-tarjeta"

/**
 * El texto de la tarjeta tiene que llegar a AA (4.5:1) sobre los seis colores
 * que ofrece el selector, en los cinco acabados.
 *
 * Antes no llegaba en ninguno: el fondo se aclaraba un 16% por decoración y el
 * texto iba en blanco fijo, así que el punto más claro del degradado --que cae
 * justo donde está la cabecera-- daba entre 1.90 y 3.29. Las etiquetas
 * pequeñas, además, iban al 60% de opacidad: entre 1.47 y 2.13.
 */
const PRESETS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"]
const ACABADOS = [null, "gradiente", "foil", "cinetico", "vidrio"]
const AA = 4.5

/**
 * El peor punto del acabado para su propio color de texto: la zona más clara si
 * el texto es blanco, la más honda si es tinta. Se leen del degradado que la
 * piel ya devolvió, no de una copia de la fórmula.
 */
function extremos(fondo: string): string[] {
  return fondo.match(/#[0-9A-Fa-f]{6}/g) ?? []
}

describe("contraste del texto de la tarjeta", () => {
  for (const codigo of ACABADOS) {
    for (const color of PRESETS) {
      it(`llega a AA con ${color} en ${codigo ?? "el acabado Lite"}`, () => {
        const piel = pielDeTarjeta(codigo, color)
        const puntos = extremos(piel.fondo)
        expect(puntos.length).toBeGreaterThan(0)
        for (const punto of puntos) {
          expect(contraste(piel.texto, punto)).toBeGreaterThanOrEqual(AA)
        }
      })
    }
  }

  it("las placas se apartan del texto en vez de aclarar siempre", () => {
    for (const color of PRESETS) {
      const piel = pielDeTarjeta(null, color)
      // La placa de «Miembro» y «Premio» desplaza el fondo un 12% hacia
      // `aparta`. Si tirara hacia el otro lado, le restaría contraste al texto.
      for (const punto of extremos(piel.fondo)) {
        const conPlaca = mezclar(punto, piel.aparta, 0.12)
        expect(contraste(piel.texto, conPlaca)).toBeGreaterThanOrEqual(contraste(piel.texto, punto))
      }
    }
  })

  it("conserva el color del negocio: no lo desvía más de lo necesario", () => {
    // Tres de los seis no se tocan; los otros tres se ajustan lo justo para
    // llegar a 4.5. El tope evita que un arreglo futuro los aplane.
    for (const color of PRESETS) {
      const [claro] = extremos(pielDeTarjeta(null, color).fondo)
      expect(contraste(claro, color)).toBeLessThan(1.35)
    }
  })
})
