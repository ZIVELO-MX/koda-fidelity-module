import { test, expect, type Page } from "@playwright/test"

/**
 * Áreas táctiles de las pantallas de acceso.
 *
 * El verificador anterior daba verde sin medir nada: comparaba todo contra
 * 44px, y el ADN pide 44 solo en un destino de navegación -- en un control el
 * mínimo es 40. Solo miraba botones, nunca enlaces, que es donde estaban casi
 * todas las faltas. Y medía al `load`, que en la puerta del portal caía en el
 * estado de carga, cuando todavía no hay botones que medir.
 *
 * Este mide ancho y alto, distingue los dos mínimos y espera a que la pantalla
 * termine de cargar.
 */
const MEDIDAS = [
  { ancho: 375, alto: 812 },
  { ancho: 768, alto: 1024 },
  { ancho: 1440, alto: 900 },
]

const MINIMO = { enlace: 44, control: 40 }

async function esperarPantalla(page: Page) {
  await page.waitForLoadState("networkidle")
  // Mientras haya spinner no hay nada definitivo que medir.
  await expect(page.locator(".animate-spin")).toHaveCount(0, { timeout: 30000 })
}

async function medir(page: Page) {
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
          tipo: el.tagName === "A" ? "enlace" : "control",
          texto: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 45),
          alto: Math.round(caja.height),
          ancho: Math.round(caja.width),
        }
      })
  })
}

for (const { ancho, alto } of MEDIDAS) {
  test.describe(`Acceso a ${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: alto } })

    for (const [nombre, ruta] of [
      ["inicio de sesión", "/login"],
      ["recuperar contraseña", "/login?recover=true"],
      ["registro", "/signup"],
    ] as const) {
      test(`${nombre}: cada destino alcanza su mínimo`, async ({ page }) => {
        await page.goto(ruta)
        await esperarPantalla(page)

        const destinos = await medir(page)
        expect(destinos.length, `${ruta} no pintó ningún destino que medir`).toBeGreaterThan(0)

        const faltas = destinos.filter((d) => d.alto < MINIMO[d.tipo as "enlace" | "control"])
        expect(
          faltas,
          `en ${ruta} a ${ancho}px:\n` +
            faltas.map((f) => `  "${f.texto}" (${f.tipo}) mide ${f.ancho}x${f.alto}, pide ${MINIMO[f.tipo as "enlace" | "control"]}`).join("\n"),
        ).toEqual([])
      })
    }
  })
}
