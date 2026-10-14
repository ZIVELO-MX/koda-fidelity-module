import { test, expect } from "@playwright/test"
import { entrar } from "./sesion"

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
  { grupo: "Operación", nombre: "Panel", url: "/dashboard", titulo: "Panel" },
]


test.describe("fluidez de la navegación", () => {
  test.skip(!HAY_SUPABASE, "Requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY")
  test.skip(!CORREO || !CLAVE, "Requiere E2E_EMAIL y E2E_PASSWORD de una cuenta admin de prueba")

  test.describe("escritorio", () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test("recorre los destinos del aside sin perderse", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
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

    test("se navega con teclado, con el foco a la vista", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)

      // Con Tab de verdad, no con focus(): `:focus-visible` solo se aplica
      // cuando el foco llegó por teclado, y es justo eso lo que se mide.
      const clientes = page.locator("aside").getByRole("link", { name: "Clientes", exact: true })
      let alcanzado = false
      for (let i = 0; i < 40 && !alcanzado; i++) {
        await page.keyboard.press("Tab")
        alcanzado = await clientes.evaluate((el) => el === document.activeElement)
      }
      expect(alcanzado, "Clientes no se alcanza tabulando desde el inicio").toBe(true)

      // El foco tiene que verse: el ADN prohíbe quitar el contorno.
      const contorno = await clientes.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, boxShadow: cs.boxShadow }
      })
      expect(
        contorno.outlineStyle !== "none" || contorno.boxShadow !== "none",
        `el destino enfocado no dibuja foco: ${JSON.stringify(contorno)}`,
      ).toBe(true)

      await page.keyboard.press("Enter")
      await page.waitForURL("**/dashboard/customers", { timeout: MARGEN_MS })
      await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible()
    })

    test("el aside se colapsa y se recupera sin perder los destinos", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
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
      await entrar(page, CORREO!, CLAVE!)

      await page.getByRole("link", { name: "Abrir escáner" }).click()
      await page.waitForURL("**/dashboard/scan", { timeout: MARGEN_MS })
      await expect(page.getByLabel("Buscar por nombre")).toBeVisible({ timeout: MARGEN_MS })

      // Sin salida no vale: desde el escáner se vuelve al panel.
      await page.getByRole("link", { name: "Panel" }).first().click()
      await page.waitForURL("**/dashboard", { timeout: MARGEN_MS })
      await expect(page.getByRole("heading", { name: "Panel", exact: true })).toBeVisible()
    })

    test("el menú abre el resto de destinos del rol", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      await page.getByRole("button", { name: "Abrir menú" }).click()
      // Por visibilidad: a 375px el aside sigue en el DOM pero oculto, así que
      // lo visible con ese nombre es lo que abrió el menú.
      for (const destino of ["Marca", "Equipo", "Configuración"]) {
        await expect(
          page.getByRole("link", { name: destino, exact: true }).filter({ visible: true }),
          `${destino} no aparece en el menú móvil`,
        ).toBeVisible({ timeout: MARGEN_MS })
      }
    })

    test("la ayuda no se busca en el menú: está en el encabezado", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      // Documentación dejó de ser un destino de navegación. La ayuda de cada
      // pantalla se abre desde el encabezado, en los dos anchos.
      await expect(page.getByRole("link", { name: "Documentación", exact: true })).toHaveCount(0)
      await page.getByRole("button", { name: /^Ayuda/ }).click()
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: MARGEN_MS })
    })
  })
})
