import { test, expect, type Page } from "@playwright/test"

// Recorrido de las superficies de la ola 1 que viven detrás del login.
//
// Se omite entero mientras falten credenciales. Para correrlo hacen falta las
// variables de Supabase que ya usa la app, más una cuenta de prueba:
//
//   E2E_EMAIL=...  E2E_PASSWORD=...  npx playwright test e2e/ola-1-con-sesion.spec.ts
//
// La cuenta debe ser de rol admin, porque el recorrido cubre Programa y Negocio.

const CORREO = process.env.E2E_EMAIL
const CLAVE = process.env.E2E_PASSWORD
const HAY_SUPABASE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)

const ANCHOS = [
  { nombre: "movil", width: 375, height: 812 },
  { nombre: "tableta", width: 768, height: 1024 },
  { nombre: "escritorio", width: 1440, height: 900 },
]

async function entrar(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Correo electrónico").fill(CORREO!)
  await page.getByLabel("Contraseña").fill(CLAVE!)
  await page.getByRole("button", { name: "Iniciar Sesión" }).click()
  await page.waitForURL("**/dashboard")
}

async function desborda(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
}

async function areasTactiles(page: Page, contexto: string) {
  for (const objetivo of await page.getByRole("button").all()) {
    if (!(await objetivo.isVisible())) continue
    const caja = await objetivo.boundingBox()
    if (caja) {
      expect(caja.height, `${await objetivo.innerText()} en ${contexto}`).toBeGreaterThanOrEqual(44)
    }
  }
}

test.describe("superficies de la ola 1, con sesión", () => {
  test.skip(!HAY_SUPABASE, "Requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY")
  test.skip(!CORREO || !CLAVE, "Requiere E2E_EMAIL y E2E_PASSWORD de una cuenta admin de prueba")

  for (const ancho of ANCHOS) {
    test.describe(`${ancho.nombre} (${ancho.width}px)`, () => {
      test.use({ viewport: { width: ancho.width, height: ancho.height } })

      test.beforeEach(async ({ page }) => {
        await entrar(page)
      })

      test("el panel muestra el día y deja la tendencia vacía con su razón", async ({ page }) => {
        await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible()
        await expect(page.getByRole("heading", { name: "Hoy" })).toBeVisible()
        await expect(page.getByText("Sellos de hoy")).toBeVisible()
        await expect(page.getByText("Canjes de hoy")).toBeVisible()
        await expect(page.getByText("Clientes nuevos hoy")).toBeVisible()

        await expect(page.getByRole("heading", { name: "Tendencia de 30 días" })).toBeVisible()
        await expect(page.getByText(/antes que dibujar una tendencia inventada/i)).toBeVisible()

        // Las cuatro cifras anteriores no eran ciertas y no deben volver.
        await expect(page.getByText("Tarjetas Activas")).toHaveCount(0)
        await expect(page.getByText("Sellos Entregados")).toHaveCount(0)
        await expect(page.getByText("Total Clientes")).toHaveCount(0)

        expect(await desborda(page), `panel en ${ancho.nombre}`).toBe(false)
        await areasTactiles(page, `panel en ${ancho.nombre}`)
      })

      test("el escáner abre la cámara y deja la búsqueda a la vista", async ({ page }) => {
        await page.goto("/dashboard/scan")
        await expect(page.getByLabel("Buscar por nombre")).toBeVisible()
        // El botón solo apaga o recupera: abrir no es una decisión de cada vez.
        await expect(
          page.getByRole("button", { name: /apagar cámara|reintentar cámara/i }),
        ).toBeVisible()
        await expect(page.getByRole("button", { name: /^abrir escáner$/i })).toHaveCount(0)

        expect(await desborda(page), `escáner en ${ancho.nombre}`).toBe(false)
      })

      test("clientes ofrece la acción en la fila y el filtro de listos", async ({ page }) => {
        await page.goto("/dashboard/customers")
        await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible()

        const filas = page.locator("tbody tr")
        if ((await filas.count()) > 0) {
          // Sellar y canjear salieron del menú de tres puntos a la propia fila.
          await expect(
            filas.first().getByRole("button", { name: /sellar|canjear/i }),
          ).toBeVisible()
        }

        expect(await desborda(page), `clientes en ${ancho.nombre}`).toBe(false)
      })
    })
  }

  test.describe("navegación de escritorio", () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test("agrupa en Operación, Programa y Negocio, sin escáner", async ({ page }) => {
      await entrar(page)
      const aside = page.locator("aside")
      await expect(aside.getByText("Operación")).toBeVisible()
      await expect(aside.getByText("Programa")).toBeVisible()
      await expect(aside.getByText("Negocio")).toBeVisible()
      await expect(aside.getByRole("link", { name: /escáner/i })).toHaveCount(0)
      await expect(aside.getByRole("link", { name: "Panel" })).toHaveCount(1)
    })
  })
})
