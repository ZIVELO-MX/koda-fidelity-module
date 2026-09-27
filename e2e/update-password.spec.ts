import { test, expect, type BrowserContext } from "@playwright/test"
import { entrar } from "./sesion"

/**
 * La pantalla de contraseña tiene dos entradas: la invitación, donde alguien
 * estrena cuenta y puede ponerse un apodo, y la recuperación, donde solo va a
 * cambiar la contraseña.
 *
 * Aquí no se envía el formulario: guardar cambiaría de verdad la contraseña de
 * la cuenta de pruebas y dejaría la siguiente corrida sin poder entrar. Lo que
 * se comprueba es lo que la pantalla enseña y cuándo deja guardar.
 */
const CORREO = process.env.E2E_EMAIL
const CLAVE = process.env.E2E_PASSWORD

function requireCredentials() {
  if (process.env.CI) {
    expect(CORREO, "auth-local requiere E2E_EMAIL").toBeTruthy()
    expect(CLAVE, "auth-local requiere E2E_PASSWORD").toBeTruthy()
    expect(process.env.FID_0019_LOCAL_E2E).toBe("true")
  } else {
    test.skip(!CORREO || !CLAVE, "Requiere una cuenta admin de prueba")
  }
}

let sessionCookies: Awaited<ReturnType<BrowserContext["cookies"]>>
test.beforeAll(async ({ browser }) => {
  // El caso público no necesita sesión. Solo se prepara cuando las credenciales
  // están presentes; los casos auth-local fallan en CI si faltan.
  if (!CORREO || !CLAVE) return
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    await entrar(page, CORREO, CLAVE)
    sessionCookies = await context.cookies()
  } finally {
    await context.close()
  }
})

test.describe("Cambio de contraseña", () => {
  test("sin sesión no se llega: manda al acceso", async ({ page }) => {
    await page.goto("/dashboard/update-password")
    await page.waitForURL("**/login", { timeout: 60000 })
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible()
  })

  test.describe("con sesión", () => {
    test.beforeEach(async ({ context }) => {
      requireCredentials()
      await context.addCookies(sessionCookies)
    })

    test("@auth-local al estrenar cuenta pide contraseña y ofrece apodo", async ({ page }) => {
      await page.goto("/dashboard/update-password")

      await expect(page.getByRole("heading", { name: "Configura tu cuenta" })).toBeVisible()
      await expect(page.getByLabel(/apodo/i)).toBeVisible()
    })

    test("@auth-local al recuperar no pide apodo: no vino a eso", async ({ page }) => {
      await page.goto("/dashboard/update-password?reason=recovery")

      await expect(page.getByRole("heading", { name: "Crea una contraseña nueva" })).toBeVisible()
      await expect(page.getByLabel(/apodo/i)).toHaveCount(0)
    })

    test("@auth-local las reglas se ven mientras se escribe, no al ser rechazado", async ({ page }) => {
      await page.goto("/dashboard/update-password?reason=recovery")

      await expect(page.getByText("Una letra mayúscula (A–Z)")).toBeVisible()
      await expect(page.getByRole("button", { name: /guardar/i })).toBeDisabled()
    })

    test("@auth-local no deja guardar una contraseña que el registro rechazaría", async ({ page }) => {
      await page.goto("/dashboard/update-password?reason=recovery")

      // Ocho caracteres y nada más: lo que esta pantalla aceptaba antes.
      await page.getByLabel("Nueva contraseña").fill("contrasena")
      await page.getByLabel("Confirmar contraseña").fill("contrasena")
      await expect(page.getByRole("button", { name: /guardar/i })).toBeDisabled()
    })

    test("@auth-local avisa cuando las dos no son iguales, antes de enviar", async ({ page }) => {
      await page.goto("/dashboard/update-password?reason=recovery")

      await page.getByLabel("Nueva contraseña").fill("Password1!")
      await page.getByLabel("Confirmar contraseña").fill("Password2!")

      await expect(page.getByText("Las dos contraseñas no son iguales.")).toBeVisible()
      await expect(page.getByRole("button", { name: /guardar/i })).toBeDisabled()
    })

    test("@auth-local con las reglas cumplidas e iguales, deja guardar", async ({ page }) => {
      await page.goto("/dashboard/update-password?reason=recovery")

      await page.getByLabel("Nueva contraseña").fill("Password1!")
      await page.getByLabel("Confirmar contraseña").fill("Password1!")

      await expect(page.getByRole("button", { name: /guardar/i })).toBeEnabled()
    })
  })
})

test.describe("Salida sin acceso", () => {
  test.beforeEach(async ({ context }) => {
    requireCredentials()
    await context.addCookies(sessionCookies)
  })

  test("@auth-local dice a dónde ir y no se lleva sola a nadie", async ({ page }) => {
    await page.goto("/dashboard/forbidden")

    await expect(page.getByRole("heading", { name: "Tus tarjetas están en otra parte" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Ir a mis tarjetas" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible()

    // La cuenta atrás redirigía sola a los cuatro segundos, en mitad de la
    // frase que estabas leyendo.
    await page.waitForTimeout(6000)
    expect(page.url()).toContain("/dashboard/forbidden")
  })
})
