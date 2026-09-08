import { test, expect, type Page } from "@playwright/test"

// Recorrido de la ola 3: Marca, Configuración, Equipo y Documentación.
//
// Va por delante de la implementación a propósito. En la ola 2 el recorrido se
// escribió al final y encontró dos defectos que llevaban horas ahí; aquí cada
// tarea nace comprobada en los tres anchos.
//
// Se omite entero sin credenciales. Ver e2e/ola-1-con-sesion.spec.ts.

const CORREO = process.env.E2E_EMAIL
const CLAVE = process.env.E2E_PASSWORD
const HAY_SUPABASE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)

const ANCHOS = [
  { nombre: "movil", width: 375, height: 812 },
  { nombre: "tableta", width: 768, height: 1024 },
  { nombre: "escritorio", width: 1440, height: 900 },
]

const SUPERFICIES = [
  { nombre: "Marca", url: "/dashboard/branding", titulo: "Marca" },
  { nombre: "Configuración", url: "/dashboard/settings", titulo: "Configuración" },
  { nombre: "Equipo", url: "/dashboard/team", titulo: "Equipo" },
  { nombre: "Documentación", url: "/dashboard/docs", titulo: "Documentación" },
]

async function entrar(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Correo electrónico").fill(CORREO!)
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  const contraseña = page.locator("#password")
  await expect(contraseña.or(page.getByText("Revisa tu correo")).first()).toBeVisible({
    timeout: 60000,
  })
  await contraseña.fill(CLAVE!)
  await page.getByRole("button", { name: "Iniciar Sesión" }).click()
  await page.waitForURL("**/dashboard", { timeout: 60000 })
}

async function desborda(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
}

/** El ADN pide 40px de área táctil, y 44px en destinos de navegación. */
async function areasTactiles(page: Page, contexto: string) {
  for (const { rol, minimo } of [
    { rol: "link" as const, minimo: 44 },
    { rol: "button" as const, minimo: 40 },
  ]) {
    for (const objetivo of await page.getByRole(rol).all()) {
      if (!(await objetivo.isVisible())) continue
      const nombre =
        (await objetivo.getAttribute("aria-label")) || (await objetivo.innerText()).trim()
      if (/next\.js/i.test(nombre)) continue
      const caja = await objetivo.boundingBox()
      if (caja) {
        expect(caja.height, `${rol} "${nombre}" en ${contexto}`).toBeGreaterThanOrEqual(minimo)
      }
    }
  }
}

test.describe("ola 3, administración del negocio", () => {
  test.skip(!HAY_SUPABASE, "Requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY")
  test.skip(!CORREO || !CLAVE, "Requiere E2E_EMAIL y E2E_PASSWORD de una cuenta admin de prueba")

  for (const ancho of ANCHOS) {
    test.describe(`${ancho.nombre} (${ancho.width}px)`, () => {
      test.use({ viewport: { width: ancho.width, height: ancho.height } })

      test("las cuatro superficies caben y se pueden tocar", async ({ page }) => {
        await entrar(page)
        for (const s of SUPERFICIES) {
          await page.goto(s.url)
          await expect(
            page.getByRole("heading", { name: s.titulo, exact: true }),
            `${s.nombre} no mostró su título`,
          ).toBeVisible({ timeout: 30000 })
          expect(await desborda(page), `${s.nombre} desborda en ${ancho.nombre}`).toBe(false)
          await areasTactiles(page, `${s.nombre} en ${ancho.nombre}`)
        }
      })
    })
  }

  test.describe("una sola fuente de verdad", () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test("el nombre del negocio solo se edita en Marca", async ({ page }) => {
      await entrar(page)

      await page.goto("/dashboard/branding")
      await expect(page.locator("#businessName")).toBeVisible()

      await page.goto("/dashboard/settings")
      await expect(
        page.locator("#businessName"),
        "el nombre volvió a ser editable en Configuración",
      ).toHaveCount(0)
      await expect(page.getByRole("link", { name: /Cambiar en Marca/i })).toBeVisible()
    })

    test("Marca guarda desde una sola barra", async ({ page }) => {
      await entrar(page)
      await page.goto("/dashboard/branding")
      await expect(page.getByRole("button", { name: /Guardar cambios/i })).toHaveCount(1)
    })
  })
})
