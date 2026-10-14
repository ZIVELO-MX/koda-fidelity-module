import { test, expect } from "@playwright/test"
import { entrar } from "./sesion"

/**
 * El acceso, contra el formulario de dos pasos que la pantalla tiene de verdad:
 * primero el correo, y solo después la contraseña. Esta prueba pedía los dos
 * campos a la vez, así que buscaba una contraseña que todavía no existe en el
 * DOM y fallaba siempre por la razón equivocada.
 *
 * Tampoco da de alta cuentas. Creaba una con `test-${Date.now()}@...` en cada
 * corrida, contra la base compartida: cuentas de basura que nadie limpia, y una
 * prueba que "pasa" tanto si el alta funciona como si falla, porque acepta
 * /dashboard y /signup como resultados igual de válidos.
 *
 *   E2E_EMAIL=...  E2E_PASSWORD=...  npx playwright test e2e/auth-flow.spec.ts
 */
const CORREO = process.env.E2E_EMAIL
const CLAVE = process.env.E2E_PASSWORD

test.describe("Acceso", () => {
  test("el formulario pide el correo primero y la contraseña después", async ({ page }) => {
    await page.goto("/login")

    await expect(page.getByLabel("Correo electrónico")).toBeVisible()
    await expect(page.locator("#password")).toBeHidden()

    await page.getByLabel("Correo electrónico").fill("no-existe@kodafidelity.test")
    await page.getByRole("button", { name: "Continuar", exact: true }).click()

    // Un correo que no es de un negocio recibe enlace mágico; uno que sí, el
    // campo de contraseña. Cualquiera de los dos prueba que el paso avanzó.
    await expect(
      page.locator("#password").or(page.getByText("Revisa tu correo")).or(page.locator('[data-slot="card"] [role="alert"]')).first(),
    ).toBeVisible({ timeout: 60000 })
  })

  test("el error del acceso se anuncia, no solo se pinta", async ({ page }) => {
    await page.goto("/login")
    // El campo es type=email y required: el navegador bloquea el envío antes de
    // que corra la validación de la pantalla, que es la que pinta el aviso.
    await page.locator("form:has(#email)").evaluate((f: HTMLFormElement) => { f.noValidate = true })
    await page.getByLabel("Correo electrónico").fill("sin-arroba")
    await page.getByRole("button", { name: "Continuar", exact: true }).click()

    const aviso = page.locator('[data-slot="card"] [role="alert"]')
    await expect(aviso).toBeVisible({ timeout: 60000 })
    await expect(aviso).toContainText(/correo electrónico válido/i)
  })

  test("recuperar contraseña manda un enlace, sin salir de la aplicación", async ({ page }) => {
    await page.goto("/login?recover=true")

    await expect(page.getByRole("heading", { name: "Recuperar contraseña" })).toBeVisible({
      timeout: 60000,
    })
    // La pantalla mandaba a WhatsApp con un número escrito a mano en el código.
    await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0)
    await expect(page.getByRole("button", { name: /enviarme el enlace/i })).toBeVisible()
  })

  test.describe("con una cuenta de negocio", () => {
    test.skip(!CORREO || !CLAVE, "Requiere E2E_EMAIL y E2E_PASSWORD de una cuenta admin de prueba")

    test("entra al panel y la sesión sobrevive a recargar", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible()

      await page.reload()
      await page.waitForURL("**/dashboard")
      await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible()
    })

    test("al salir, el panel deja de abrirse", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)

      // Cerrar sesión no es un botón suelto: vive en el menú de perfil de la
      // barra lateral y pide confirmación. La prueba pulsaba un botón que no
      // existe en ninguna pantalla y agotaba el tiempo.
      await page.getByRole("button", { name: "Abrir menú de perfil" }).click()
      await page.getByRole("menuitem", { name: "Cerrar Sesión" }).click()
      await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click()

      await page.waitForURL("**/login", { timeout: 60000 })

      await page.goto("/dashboard")
      await page.waitForURL("**/login")
    })
  })
})
