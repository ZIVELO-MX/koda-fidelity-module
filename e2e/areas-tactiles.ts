import { expect, type Page } from "@playwright/test"

/**
 * El verificador de área táctil, uno solo.
 *
 * Vivía copiado en cinco specs y los cinco medían **solo el alto**. Un control
 * de 27x44 pasaba: alto suficiente, ancho de menos, imposible de atinar con el
 * pulgar. El ADN pide área, no altura, así que aquí se miden las dos
 * dimensiones.
 *
 * La medición se hace en el navegador y de una sola pasada: `getByRole().all()`
 * con un `boundingBox` por elemento era una ida y vuelta por control, y en una
 * pantalla con cincuenta se notaba.
 */
export const MINIMO = { enlace: 44, control: 40 } as const

export type Destino = {
  tipo: "enlace" | "control"
  texto: string
  ancho: number
  alto: number
}

export async function medirDestinos(page: Page): Promise<Destino[]> {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const caja = el.getBoundingClientRect()
      if (caja.width === 0 || caja.height === 0) return false
      const estilo = getComputedStyle(el)
      return estilo.visibility !== "hidden" && estilo.display !== "none"
    }
    return [...document.querySelectorAll("a[href], button")]
      .filter(visible)
      .map((el) => {
        const caja = el.getBoundingClientRect()
        return {
          tipo: el.tagName === "A" ? ("enlace" as const) : ("control" as const),
          texto: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 45),
          ancho: Math.round(caja.width),
          alto: Math.round(caja.height),
        }
      })
      // El overlay de desarrollo de Next no es interfaz de la aplicación.
      .filter((d) => !/next\.js/i.test(d.texto))
  })
}

/** Lo que no alcanza su mínimo, en cualquiera de las dos dimensiones. */
export function faltantes(destinos: Destino[], conocidos: string[] = []) {
  return destinos.filter((d) => {
    const minimo = MINIMO[d.tipo]
    if (d.alto >= minimo && d.ancho >= minimo) return false
    return !conocidos.includes(`${d.tipo} ${d.texto}`)
  })
}

export function informe(faltas: Destino[], contexto: string) {
  return (
    `área táctil insuficiente en ${contexto}:\n` +
    faltas
      .map((f) => `  "${f.texto}" (${f.tipo}) mide ${f.ancho}x${f.alto}, pide ${MINIMO[f.tipo]}x${MINIMO[f.tipo]}`)
      .join("\n")
  )
}

/** Mide y asierta de una vez, que es lo que quieren casi todos los specs. */
export async function verificarAreasTactiles(page: Page, contexto: string, conocidos: string[] = []) {
  const destinos = await medirDestinos(page)
  expect(destinos.length, `${contexto} no pintó ningún destino que medir`).toBeGreaterThan(0)
  const faltas = faltantes(destinos, conocidos)
  expect(faltas, informe(faltas, contexto)).toEqual([])
}
