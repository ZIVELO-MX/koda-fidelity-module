import { test, expect, type Page } from "@playwright/test"
import { medirDestinos, faltantes, informe, MINIMO } from "./areas-tactiles"

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


async function esperarPantalla(page: Page) {
  await page.waitForLoadState("networkidle")
  // Mientras haya spinner no hay nada definitivo que medir.
  await expect(page.locator(".animate-spin")).toHaveCount(0, { timeout: 30000 })
}

for (const { ancho, alto } of MEDIDAS) {
  test.describe(`Acceso a ${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: alto } })

    for (const [nombre, ruta] of [
      ["inicio de sesión", "/login"],
      ["recuperar contraseña", "/login?recover=true"],
      ["registro", "/signup"],
      ["puerta del portal", "/my-cards"],
    ] as const) {
      test(`${nombre}: cada destino alcanza su mínimo`, async ({ page }) => {
        await page.goto(ruta)
        await esperarPantalla(page)

        const destinos = await medirDestinos(page)
        expect(destinos.length, `${ruta} no pintó ningún destino que medir`).toBeGreaterThan(0)

        const faltas = faltantes(destinos)
        expect(faltas, informe(faltas, `${ruta} a ${ancho}px`)).toEqual([])
      })
    }
  })
}
