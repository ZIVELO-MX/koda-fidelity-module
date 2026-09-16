import { test, expect } from "@playwright/test"
import { entrar } from "./sesion"

/**
 * El alta guiada, recorrida entera. Hoy, al registrarse, se cae directo a un
 * panel vacío: no hay intro, ni planes, ni una pregunta sobre el negocio.
 *
 * El cobro no existe todavía, así que la prueba llega al muro de pago y
 * comprueba lo que la pantalla promete, sin intentar pagar.
 */
const CORREO = process.env.E2E_EMAIL
const CLAVE = process.env.E2E_PASSWORD

const MEDIDAS = [
  { ancho: 375, alto: 812, nombre: "movil" },
  { ancho: 768, alto: 1024, nombre: "tableta" },
  { ancho: 1440, alto: 900, nombre: "escritorio" },
]

test.describe("Alta guiada", () => {
  test("sin sesión no se llega: manda al acceso", async ({ page }) => {
    await page.goto("/onboarding")
    await page.waitForURL("**/login", { timeout: 60000 })
  })

  test.describe("con sesión", () => {
    test.skip(!CORREO || !CLAVE, "Requiere E2E_EMAIL y E2E_PASSWORD de una cuenta admin de prueba")

    for (const { ancho, alto, nombre } of MEDIDAS) {
      test(`el recorrido completo funciona en ${nombre} (${ancho}px)`, async ({ page }) => {
        await page.setViewportSize({ width: ancho, height: alto })
        await entrar(page, CORREO!, CLAVE!)
        await page.goto("/onboarding")

        // La intro se puede saltar desde la primera lámina.
        await expect(page.getByRole("button", { name: "Saltar la introducción" })).toBeVisible()
        await page.getByRole("button", { name: "Saltar la introducción" }).click()

        // Datos: sin nombre y sin categoría no se avanza, y se dice por qué.
        await expect(page.getByRole("heading", { name: "Tu negocio" })).toBeVisible()
        await page.getByLabel("Nombre del negocio").fill("")
        await page.getByRole("button", { name: "Continuar" }).click()
        await expect(page.locator("#contenido [role='alert']")).toContainText(/nombre de tu negocio/i)

        await page.getByLabel("Nombre del negocio").fill("Café Aurora")
        await page.getByRole("button", { name: "Cafetería", exact: true }).click()
        await page.getByRole("button", { name: "Continuar" }).click()

        // Tarjeta: la vista previa sigue lo que se escribe.
        await expect(page.getByRole("heading", { name: "Tu primera tarjeta" })).toBeVisible()
        await page.getByRole("button", { name: "8", exact: true }).click()
        await page.getByLabel("Recompensa").fill("Décimo café gratis")
        await expect(page.getByText("0/8")).toBeVisible()
        await page.getByRole("button", { name: "Continuar" }).click()

        // El momento de llegada, con su nombre y la tarjeta vacía.
        await expect(page.getByRole("heading", { name: "Club Café Aurora" })).toBeVisible()
        await expect(page.getByText("Así lo verán tus clientes.")).toBeVisible()
        await page.getByRole("button", { name: "Continuar" }).click()

        // El origen se puede saltar y nunca bloquea.
        await expect(page.getByRole("heading", { name: /cómo llegaste/i })).toBeVisible()
        await page.getByRole("button", { name: "Saltar", exact: true }).click()

        // Muro de pago: anual preseleccionado, Pro con su precio y su fecha, y
        // una salida que no está escondida.
        await expect(page.getByRole("heading", { name: "Publica tu tarjeta" })).toBeVisible()
        await expect(page.getByRole("radio", { name: /al año/i })).toBeChecked()
        await expect(page.getByText("2 meses gratis")).toBeVisible()
        await expect(page.getByRole("button", { name: /contratar lite, \$1,490/i })).toBeVisible()
        await expect(page.getByText(/disponible al terminar tu primer mes/i)).toBeVisible()
        await expect(page.getByRole("link", { name: "Salir sin publicar" })).toBeVisible()

        // Al mes los importes cambian y el botón lleva el precio del mes.
        await page.getByRole("radio", { name: "Al mes" }).click()
        await expect(page.getByRole("button", { name: /contratar lite, \$149$/i })).toBeVisible()
      })
    }

    test("lo escrito se recupera al volver, sin dar por hecho lo que falta", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      await page.goto("/onboarding")
      await page.getByRole("button", { name: "Saltar la introducción" }).click()
      await page.getByLabel("Nombre del negocio").fill("Panadería Lupita")
      await page.getByRole("button", { name: "Pastelería", exact: true }).click()
      await page.getByRole("button", { name: "Continuar" }).click()
      await expect(page.getByRole("heading", { name: "Tu primera tarjeta" })).toBeVisible()

      await page.reload()

      await expect(page.getByText("Seguimos donde lo dejaste.")).toBeVisible()
      await expect(page.getByRole("heading", { name: "Tu primera tarjeta" })).toBeVisible()
      // La recompensa no se inventa: nadie la escribió todavía.
      await expect(page.getByLabel("Recompensa")).toHaveValue("")
      await page.getByRole("button", { name: "Continuar" }).click()
      await expect(page.locator("#contenido [role='alert']")).toContainText(/qué se lleva tu cliente/i)
    })
  })
})
