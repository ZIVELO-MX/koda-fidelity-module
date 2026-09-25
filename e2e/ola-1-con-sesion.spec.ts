import { test, expect, type Page } from "@playwright/test"
import { verificarAreasTactiles } from "./areas-tactiles"
import { entrar } from "./sesion"

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

// El acceso va en dos pasos: primero el correo, y la contraseña después.
//
// CUIDADO: el primer paso decide por el correo. Si NO pertenece a un negocio, la
// app lo trata como cliente y le manda un enlace mágico por correo de verdad,
// creando la cuenta si no existe. Por eso `E2E_EMAIL` tiene que ser la cuenta de
// un negocio, y por eso esto falla de inmediato en vez de reintentar: repetirlo
// quema la cuota de correo del proyecto de Supabase.

async function desborda(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
}

// El ADN pide 40px de área táctil mínima, y 44px en destinos de navegación. Los
// destinos son enlaces; los botones son controles. Antes esto solo medía
// botones, y por eso no veía la barra de navegación móvil, que son enlaces.
const areasTactiles = verificarAreasTactiles

test.describe("superficies de la ola 1, con sesión", () => {
  test.describe.configure({ mode: "serial" })
  test.skip(!HAY_SUPABASE, "Requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY")
  test.skip(!CORREO || !CLAVE, "Requiere E2E_EMAIL y E2E_PASSWORD de una cuenta admin de prueba")

  let page: Page
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await entrar(page, CORREO!, CLAVE!)
  })
  test.afterAll(async () => page?.close())

  for (const ancho of ANCHOS) {
    test.describe(`${ancho.nombre} (${ancho.width}px)`, () => {
      test.beforeEach(async () => {
        await page.setViewportSize({ width: ancho.width, height: ancho.height })
        await page.goto("/dashboard")
      })

      test("el panel muestra el día y su histórico, ya sin el hueco de la tendencia", async () => {
        await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible()
        await expect(page.getByRole("heading", { name: "Hoy" })).toBeVisible()
        await expect(page.getByText("Sellos de hoy")).toBeVisible()
        await expect(page.getByText("Canjes de hoy")).toBeVisible()
        await expect(page.getByText("Clientes nuevos hoy")).toBeVisible()

        // El hueco que decía "la serie diaria llega cuando el backend la
        // publique" se fue: el backend ya la publica y el panel la pinta.
        await expect(page.getByText(/antes que dibujar una tendencia inventada/i)).toHaveCount(0)
        await expect(page.getByRole("heading", { name: "Cómo va tu programa" })).toBeVisible()
        await expect(page.getByRole("heading", { name: "Toda la actividad" })).toBeVisible()

        // Los dos bloques resuelven su carga: ni se quedan en el spinner ni
        // dejan una alerta sin explicar.
        const metricas = page.locator("section", { has: page.getByRole("heading", { name: "Cómo va tu programa" }) })
        await expect(metricas.getByText(/cargando tus métricas/i)).toHaveCount(0, { timeout: 30000 })
        await expect(metricas.getByRole("radio", { name: "30 días" })).toBeChecked()

        // Las cuatro cifras anteriores no eran ciertas y no deben volver.
        await expect(page.getByText("Tarjetas Activas")).toHaveCount(0)
        await expect(page.getByText("Sellos Entregados")).toHaveCount(0)
        await expect(page.getByText("Total Clientes")).toHaveCount(0)

        expect(await desborda(page), `panel en ${ancho.nombre}`).toBe(false)
        await areasTactiles(page, `panel en ${ancho.nombre}`)
      })

      test("el escáner abre la cámara y deja la búsqueda a la vista", async () => {
        await page.goto("/dashboard/scan")
        await expect(page.getByLabel("Buscar por nombre")).toBeVisible()
        // El botón solo apaga o recupera: abrir no es una decisión de cada vez.
        await expect(
          page.getByRole("button", { name: /apagar cámara|reintentar cámara/i }),
        ).toBeVisible()
        await expect(page.getByRole("button", { name: /^abrir escáner$/i })).toHaveCount(0)

        expect(await desborda(page), `escáner en ${ancho.nombre}`).toBe(false)
      })

      test("el portal del cliente pone la tarjeta a pantalla, sin desbordar", async () => {
        await page.goto("/dashboard/my-cards")

        // El portal tiene tres caras legítimas según quién entre: pedir el
        // correo, decir que mandó el enlace, o enseñar las tarjetas. La prueba
        // no fija cuál toca -- depende de la cuenta -- sino que siempre llegue
        // a una de las tres y ninguna deje un hueco sin explicar.
        const puerta = page.getByRole("heading", { name: "Mis Tarjetas de Lealtad" })
        const enviado = page.getByRole("heading", { name: "Revisa tu correo" })
        const conTarjetas = page.getByRole("heading", { name: "Tus tarjetas" })
        await expect(
          puerta.or(enviado).or(conTarjetas).first(),
          "el portal no llegó a ninguno de sus tres estados",
        ).toBeVisible({ timeout: 30000 })

        // Y nunca se queda en el cargando.
        await expect(page.locator(".animate-spin")).toHaveCount(0, { timeout: 30000 })

        expect(await desborda(page), `portal en ${ancho.nombre}`).toBe(false)
        await areasTactiles(page, `portal en ${ancho.nombre}`)
      })

      test("clientes ofrece la acción en la fila y el filtro de listos", async () => {
        await page.goto("/dashboard/customers")
        // Exacto: el estado vacío trae "Aún no tienes clientes", que también casa.
        await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible()

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
    test.beforeEach(async () => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto("/dashboard")
    })

    test("agrupa en Operación, Programa y Negocio, sin escáner", async () => {
      const aside = page.locator("aside")
      // Por rol y exacto: el nombre del negocio en el perfil también contiene
      // "Negocio", y haría ambigua una búsqueda por texto suelto.
      for (const grupo of ["Operación", "Programa", "Negocio"]) {
        await expect(aside.getByRole("button", { name: grupo, exact: true })).toBeVisible()
      }
      await expect(aside.getByRole("link", { name: /escáner/i })).toHaveCount(0)
      await expect(aside.getByRole("link", { name: "Panel" })).toHaveCount(1)
    })
  })
})
