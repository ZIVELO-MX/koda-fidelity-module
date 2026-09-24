import { test, expect, type Page } from "@playwright/test"
import { verificarAreasTactiles } from "./areas-tactiles"

/**
 * Las siete pantallas de acceso, recorridas en los tres anchos.
 *
 * No necesita sesión: seis son públicas, y de las dos del panel se comprueba
 * justo lo contrario, que sin sesión no dejan entrar. Esa es su conducta de
 * acceso y es lo que esta misión tiene que sostener.
 *
 * Cada pantalla se mira por tres cosas: que monte su contenido -- la regresión
 * de `/auth/error` fue quedarse en blanco --, que no desborde a lo ancho, y que
 * sus destinos alcancen el área táctil del ADN.
 */
const MEDIDAS = [
  { ancho: 375, alto: 812 },
  { ancho: 768, alto: 1024 },
  { ancho: 1440, alto: 900 },
]

/** Un token que no existe. Sirve para el caso inválido sin tocar datos reales. */
const TOKEN_FABRICADO = "esta-invitacion-no-existe-1234567890"

const PUBLICAS = [
  { nombre: "inicio de sesión", ruta: "/login", ancla: /iniciar sesión|correo electrónico/i },
  { nombre: "recuperar contraseña", ruta: "/login?recover=true", ancla: /recuperar|correo electrónico/i },
  { nombre: "registro", ruta: "/signup", ancla: /crear cuenta|solicitar acceso/i },
  { nombre: "invitación", ruta: `/invite?token=${TOKEN_FABRICADO}`, ancla: /invitación no disponible/i },
  { nombre: "error de autenticación", ruta: "/auth/error", ancla: /enlace|sesión|correo/i },
  { nombre: "puerta del portal", ruta: "/my-cards", ancla: /tarjetas|correo/i },
] as const

async function desborda(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
}

for (const { ancho, alto } of MEDIDAS) {
  test.describe(`pantallas de acceso a ${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: alto } })

    for (const pantalla of PUBLICAS) {
      test(`${pantalla.nombre}: monta su contenido y cabe`, async ({ page }) => {
        await page.goto(pantalla.ruta)
        await expect(page.locator(".animate-spin")).toHaveCount(0, { timeout: 30000 })

        // Montar su contenido: la regresión de /auth/error fue devolver un
        // Suspense sin hijos y quedarse en blanco con todo escrito al lado.
        await expect(
          page.getByText(pantalla.ancla).first(),
          `${pantalla.ruta} no montó su contenido`,
        ).toBeVisible({ timeout: 30000 })

        expect(await desborda(page), `${pantalla.ruta} desborda a ${ancho}px`).toBe(false)
        await verificarAreasTactiles(page, `${pantalla.nombre} a ${ancho}px`)
      })
    }

    test("una invitación fabricada no nombra a ningún negocio", async ({ page }) => {
      // La propiedad que importa: el token es de un uso y se valida contra una
      // invitación existente, así que inventarse uno no puede sacar el nombre
      // de un negocio real ni ofrecer el botón de aceptar.
      await page.goto(`/invite?token=${TOKEN_FABRICADO}`)
      await expect(page.getByRole("heading", { name: /invitación no disponible/i })).toBeVisible()
      await expect(page.getByText(/te invitaron a/i)).toHaveCount(0)
      await expect(page.getByRole("button", { name: /aceptar invitación/i })).toHaveCount(0)
    })

    test("sin token tampoco se entra", async ({ page }) => {
      await page.goto("/invite")
      await expect(page.getByRole("heading", { name: /invitación no disponible/i })).toBeVisible()
    })

    for (const [nombre, ruta] of [
      ["cambio de contraseña inicial", "/dashboard/update-password"],
      ["salida sin acceso", "/dashboard/forbidden"],
    ] as const) {
      test(`${nombre}: sin sesión manda al login`, async ({ page }) => {
        await page.goto(ruta)
        await page.waitForURL("**/login**", { timeout: 30000 })
        // Y llega al login de verdad, no a una pantalla de error de carga.
        await expect(page.getByText(/error al cargar/i)).toHaveCount(0)
      })
    }
  })
}
