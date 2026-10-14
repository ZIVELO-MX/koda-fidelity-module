/**
 * Contraste del texto de la tarjeta sobre los seis colores del selector.
 *
 * A diferencia de `contraste.mjs`, que mide los acentos de categoría con su
 * propia copia de la matemática, este importa `lib/color-marca` y
 * `lib/temas-de-tarjeta` para medir exactamente lo que pinta la aplicación: los
 * extremos del degradado que devuelve `pielDeTarjeta` y el color de texto que
 * ella misma eligió.
 *
 * Correr con `pnpm exec tsx docs/design/verificadores/contraste-marca.ts`.
 */
import { contraste } from "@/lib/color-marca"
import { pielDeTarjeta } from "@/lib/temas-de-tarjeta"

const PRESETS: [string, string][] = [
  ["Naranja", "#f97316"], ["Azul", "#3b82f6"], ["Verde", "#10b981"],
  ["Violeta", "#8b5cf6"], ["Rosa", "#ec4899"], ["Ámbar", "#f59e0b"],
]
const ACABADOS: [string, string | null][] = [
  ["Lite", null], ["gradiente", "gradiente"], ["foil", "foil"],
  ["cinetico", "cinetico"], ["vidrio", "vidrio"],
]
const n = (v: number) => v.toFixed(2)
const extremos = (fondo: string) => fondo.match(/#[0-9A-Fa-f]{6}/g) ?? []

for (const [nombreAcabado, codigo] of ACABADOS) {
  console.log(`\n### ${nombreAcabado}\n`)
  console.log("| Color | Marca | Base pintada | Texto | Peor contraste |")
  console.log("|---|---|---|---|---|")
  for (const [nombre, hex] of PRESETS) {
    const piel = pielDeTarjeta(codigo, hex)
    const puntos = extremos(piel.fondo)
    const peor = Math.min(...puntos.map((p) => contraste(piel.texto, p)))
    const etiqueta = piel.texto === "#FFFFFF" ? "blanco" : "tinta"
    console.log(`| ${nombre} | \`${hex}\` | \`${puntos[0]}\` | ${etiqueta} | ${n(peor)} |`)
  }
}
