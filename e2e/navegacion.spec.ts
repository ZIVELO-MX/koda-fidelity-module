import { test, expect, type Page } from "@playwright/test"

// Fluidez de la navegación: se recorre haciendo clic, no con goto, que es como
// la usa una persona. Cada destino tiene que llegar, anunciarse como activo y no
// dejar sin salida.
//
// Se omite entero sin credenciales. Ver e2e/ola-1-con-sesion.spec.ts.

const CORREO = process.env.E2E_EMAIL
const CLAVE = process.env.E2E_PASSWORD
const HAY_SUPABASE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)

// Cada salto debe resolverse dentro de este margen. Es holgado a propósito: en
// desarrollo la ruta se compila al primer pedido. Lo que caza es un destino que
// nunca llega, no una décima de más.
const MARGEN_MS = 20000

const DESTINOS = [
  { grupo: "Operación", nombre: "Clientes", url: "/dashboard/customers", titulo: "Clientes" },
  { grupo: "Programa", nombre: "Tarjetas", url: "/dashboard/cards", titulo: "Tarjetas de Lealtad" },
  { grupo: "Programa", nombre: "Códigos QR", url: "/dashboard/qr-codes", titulo: "Códigos QR" },
  { grupo: "Negocio", nombre: "Marca", url: "/dashboard/branding", titulo: "Marca" },
  { grupo: "Negocio", nombre: "Equipo", url: "/dashboard/team", titulo: "Equipo" },
  { grupo: "Negocio", nombre: "Configuración", url: "/dashboard/settings", titulo: "Configuración" },
  { grupo: "Negocio", nombre: "Documentación", url: "/dashboard/docs", titulo: "Documentación" },
  { grupo: "Operación", nombre: "Panel", url: "/dashboard", titulo: "Panel" },
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

test.describe("fluidez de la navegación", () => {
  test.skip(!HAY_SUPABASE, "Requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY")
  test.skip(!CORREO || !CLAVE, "Requiere E2E_EMAIL y E2E_PASSWORD de una cuenta admin de prueba")

  test.describe("escritorio", () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test("recorre los ocho destinos del aside sin perderse", async ({ page }) => {
      await entrar(page)
      const aside = page.locator("aside")

      for (const destino of DESTINOS) {
        const inicio = Date.now()
        await aside.getByRole("link", { name: destino.nombre, exact: true }).click()
        await page.waitForURL(`**${destino.url}`, { timeout: MARGEN_MS })
        const tardó = Date.now() - inicio

        await expect(
          page.getByRole("heading", { name: destino.titulo, exact: true }),
          `${destino.nombre} no mostró su título`,
        ).toBeVisible({ timeout: MARGEN_MS })

        // Nada de pantallas de error por el camino.
        await expect(page.getByText("Error al cargar el panel")).toHaveCount(0)

        // El destino activo se anuncia, no solo se pinta.
        await expect(
          aside.getByRole("link", { name: destino.nombre, exact: true }),
          `${destino.nombre} no quedó marcado como activo`,
        ).toHaveAttribute("aria-current", "page")

        expect(tardó, `${destino.nombre} tardó ${tardó}ms`).toBeLessThan(MARGEN_MS)
      }
    })

    test("el aside se colapsa y se recupera sin perder los destinos", async ({ page }) => {
      await entrar(page)
      const aside = page.locator("aside")

      await page.getByRole("button", { name: "Colapsar barra lateral" }).click()
      await expect(aside.getByRole("link", { name: "Panel", exact: true })).toBeVisible()

      await page.getByRole("button", { name: "Expandir barra lateral" }).click()
      await expect(aside.getByRole("link", { name: "Clientes", exact: true })).toBeVisible()
    })
  })

  test.describe("móvil", () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test("la barra inferior lleva al escáner y de vuelta", async ({ page }) => {
      await entrar(page)

      await page.getByRole("link", { name: "Abrir escáner" }).click()
      await page.waitForURL("**/dashboard/scan", { timeout: MARGEN_MS })
      await expect(page.getByLabel("Buscar por nombre")).toBeVisible({ timeout: MARGEN_MS })

      // Sin salida no vale: desde el escáner se vuelve al panel.
      await page.getByRole("link", { name: "Panel" }).first().click()
      await page.waitForURL("**/dashboard", { timeout: MARGEN_MS })
      await expect(page.getByRole("heading", { name: "Panel", exact: true })).toBeVisible()
    })

    test("el menú abre el resto de destinos del rol", async ({ page }) => {
      await entrar(page)
      await page.getByRole("button", { name: "Abrir menú" }).click()
      // Por visibilidad: a 375px el aside sigue en el DOM pero oculto, así que
      // lo visible con ese nombre es lo que abrió el menú.
      for (const destino of ["Marca", "Equipo", "Configuración", "Documentación"]) {
        await expect(
          page.getByRole("link", { name: destino, exact: true }).filter({ visible: true }),
          `${destino} no aparece en el menú móvil`,
        ).toBeVisible({ timeout: MARGEN_MS })
      }
    })
  })
})
