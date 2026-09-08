import { test, expect, type Page } from "@playwright/test"

// Recorrido de la ola 2: publicar una tarjeta, verla en el listado y en su
// detalle, y llegar a su código. Se omite entero sin credenciales.
//
// Crea una tarjeta de verdad en la base de desarrollo y la archiva al terminar,
// que es lo único que la interfaz permite sin salirse del recorrido.

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

test.describe("ola 2, tarjetas y códigos", () => {
  test.skip(!HAY_SUPABASE, "Requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY")
  test.skip(!CORREO || !CLAVE, "Requiere E2E_EMAIL y E2E_PASSWORD de una cuenta admin de prueba")

  for (const ancho of ANCHOS) {
    test.describe(`${ancho.nombre} (${ancho.width}px)`, () => {
      test.use({ viewport: { width: ancho.width, height: ancho.height } })

      test("publicar son tres decisiones y termina en el código", async ({ page }) => {
        await entrar(page)
        const nombre = `Recorrido ${ancho.nombre} ${Date.now()}`
        let enviado: Record<string, unknown> | null = null
        page.on("request", (r) => {
          if (r.url().includes("/api/cards") && r.method() === "POST") {
            enviado = JSON.parse(r.postData() || "{}")
          }
        })

        await page.goto("/dashboard/cards/new")

        // Los cuatro pasos se fueron: no hay indicador de progreso.
        await expect(page.getByText("Revisión", { exact: true })).toHaveCount(0)
        // La marca se hereda, no se pregunta.
        await expect(page.getByLabel("Nombre del Negocio")).toHaveCount(0)

        // Publicar sin nada frena y lleva el foco al primer campo de la pantalla.
        await page.getByRole("button", { name: /Publicar tarjeta/i }).click()
        await expect(page.getByRole("alert").first()).toBeVisible()
        expect(enviado, "el POST salió con el borrador incompleto").toBeNull()

        await page.getByLabel("¿Qué se lleva el cliente?").fill("Un café gratis")
        await page.getByLabel("¿Cómo se llama la tarjeta?").fill(nombre)

        // Una sorpresa que nadie llegó a llenar no debe viajar.
        await page.getByText("Opciones adicionales").click()
        await page.getByRole("button", { name: /Añadir sorpresa/i }).click()

        expect(await desborda(page), `creación en ${ancho.nombre}`).toBe(false)

        await page.getByRole("button", { name: /Publicar tarjeta/i }).click()
        await page.waitForURL("**/dashboard/qr-codes/**", { timeout: 60000 })

        expect(
          (enviado as { milestoneRewards?: unknown[] } | null)?.milestoneRewards,
          "una sorpresa sin etiqueta llegó al servidor",
        ).toEqual([])

        // Compartir es una acción; descargar e imprimir es otra sección.
        await expect(page.getByRole("button", { name: /Copiar link/i })).toBeVisible()
        await expect(page.getByRole("button", { name: /Solo el código, PNG/i })).toBeVisible()
        await expect(page.getByRole("button", { name: /Abrir PDF/i })).toBeVisible()
        // El panel que repetía nombre, recompensa y meta ya no está.
        await expect(page.getByText("Meta", { exact: true })).toHaveCount(0)
        expect(await desborda(page), `códigos en ${ancho.nombre}`).toBe(false)

        // El id sale de la propia URL del código, así el listado se busca por
        // href y no por la forma del árbol, que cambia con el diseño.
        const cardId = new URL(page.url()).pathname.split("/").pop()!

        // El listado enseña la tarjeta y ofrece una sola acción por elemento.
        await page.goto("/dashboard/cards")
        await expect(page.getByRole("heading", { name: nombre, exact: true })).toBeVisible()
        const verTarjeta = page.locator(`a[href="/dashboard/cards/${cardId}"]`)
        await expect(verTarjeta).toHaveText("Ver tarjeta")
        expect(await desborda(page), `listado en ${ancho.nombre}`).toBe(false)

        // El detalle lo encabeza la tarjeta y las cifras van en una línea.
        await verTarjeta.click()
        await page.waitForURL(`**/dashboard/cards/${cardId}`, { timeout: 60000 })
        await expect(page.getByRole("heading", { name: nombre, exact: true })).toBeVisible()
        // Acotado a la línea de cifras: "Clientes" también es un destino del menú.
        const cifras = page.locator("dl").first()
        for (const cifra of ["Clientes", "Sellos", "Listos para canjear", "Vencimiento"]) {
          await expect(cifras.getByText(cifra, { exact: true })).toBeVisible()
        }
        expect(await desborda(page), `detalle en ${ancho.nombre}`).toBe(false)

        // Se archiva para no dejar basura en la base de desarrollo.
        await page.getByRole("button", { name: /Más acciones para/i }).click()
        await page.getByRole("menuitem", { name: "Archivar" }).click()
        await page.getByRole("button", { name: "Archivar" }).last().click()
        await page.waitForURL("**/dashboard/cards", { timeout: 60000 })
      })
    })
  }
})
