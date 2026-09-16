import { test, expect } from "@playwright/test"
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

test.describe("Cambio de contraseña", () => {
  test("sin sesión no se llega: manda al acceso", async ({ page }) => {
    await page.goto("/dashboard/update-password")
    await page.waitForURL("**/login", { timeout: 60000 })
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible()
  })

  test.describe("con sesión", () => {
    test.skip(!CORREO || !CLAVE, "Requiere E2E_EMAIL y E2E_PASSWORD de una cuenta admin de prueba")

    test("al estrenar cuenta pide contraseña y ofrece apodo", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      await page.goto("/dashboard/update-password")

      await expect(page.getByRole("heading", { name: "Configura tu cuenta" })).toBeVisible()
      await expect(page.getByLabel(/apodo/i)).toBeVisible()
    })

    test("al recuperar no pide apodo: no vino a eso", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      await page.goto("/dashboard/update-password?reason=recovery")

      await expect(page.getByRole("heading", { name: "Crea una contraseña nueva" })).toBeVisible()
      await expect(page.getByLabel(/apodo/i)).toHaveCount(0)
    })

    test("las reglas se ven mientras se escribe, no al ser rechazado", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      await page.goto("/dashboard/update-password?reason=recovery")

      await expect(page.getByText("Una letra mayúscula (A–Z)")).toBeVisible()
      await expect(page.getByRole("button", { name: /guardar/i })).toBeDisabled()
    })

    test("no deja guardar una contraseña que el registro rechazaría", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      await page.goto("/dashboard/update-password?reason=recovery")

      // Ocho caracteres y nada más: lo que esta pantalla aceptaba antes.
      await page.getByLabel("Nueva contraseña").fill("contrasena")
      await page.getByLabel("Confirmar contraseña").fill("contrasena")
      await expect(page.getByRole("button", { name: /guardar/i })).toBeDisabled()
    })

    test("avisa cuando las dos no son iguales, antes de enviar", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      await page.goto("/dashboard/update-password?reason=recovery")

      await page.getByLabel("Nueva contraseña").fill("Password1!")
      await page.getByLabel("Confirmar contraseña").fill("Password2!")

      await expect(page.getByText("Las dos contraseñas no son iguales.")).toBeVisible()
      await expect(page.getByRole("button", { name: /guardar/i })).toBeDisabled()
    })

    test("con las reglas cumplidas e iguales, deja guardar", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      await page.goto("/dashboard/update-password?reason=recovery")

      await page.getByLabel("Nueva contraseña").fill("Password1!")
      await page.getByLabel("Confirmar contraseña").fill("Password1!")

      await expect(page.getByRole("button", { name: /guardar/i })).toBeEnabled()
    })
  })
})

test.describe("Salida sin acceso", () => {
  test.skip(!CORREO || !CLAVE, "Requiere E2E_EMAIL y E2E_PASSWORD de una cuenta admin de prueba")

  test("dice a dónde ir y no se lleva sola a nadie", async ({ page }) => {
    await entrar(page, CORREO!, CLAVE!)
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
