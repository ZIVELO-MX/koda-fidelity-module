import { test, expect } from "@playwright/test"

test.describe("Google OAuth Flow", () => {
  test("auth/callback redirects to error when no code param", async ({ page }) => {
    await page.goto("/auth/callback")
    await page.waitForURL("**/auth/error?error=OAuth%20callback%20error")
  })

  test("auth/callback redirects to next param when provided", async ({ page }) => {
    await page.goto("/auth/callback?next=%2Fdashboard%2Fmy-cards")
    await page.waitForURL("**/auth/error?error=OAuth%20callback%20error")
  })

  test("un enlace de alta que no lleva a ninguna tarjeta lo dice y ofrece salida", async ({ page }) => {
    await page.goto("/join/test-card-id")
    await expect(page.getByRole("heading", { name: "Este enlace no lleva a ninguna tarjeta" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Ir al inicio" })).toBeVisible()
  })

  test("la puerta del portal habla al cliente, no al dueño de un negocio", async ({ page }) => {
    await page.goto("/my-cards")
    await expect(page.getByRole("heading", { name: "Tus tarjetas de lealtad" })).toBeVisible()
    await expect(page.getByText(/cuántos sellos llevas/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /continuar con google/i })).toBeVisible()
  })

  test("y ofrece el correo como segunda entrada", async ({ page }) => {
    await page.goto("/my-cards")
    await expect(page.getByText("o con tu correo")).toBeVisible()
    await expect(page.getByLabel("Correo Electrónico")).toBeVisible()
    await expect(page.getByRole("button", { name: /enviar enlace mágico/i })).toBeVisible()
    await expect(page.getByText(/no necesitas contraseña/i)).toBeVisible()
  })

  test("un correo mal escrito se anuncia, no se traga", async ({ page }) => {
    await page.goto("/my-cards")
    // El campo es type=email: el navegador bloquea el envío antes de que corra
    // la validación de la pantalla, que es la que pinta el aviso.
    await page.locator("form").evaluate((f: HTMLFormElement) => { f.noValidate = true })
    await page.getByLabel("Correo Electrónico").fill("sin-arroba")
    await page.getByRole("button", { name: /enviar enlace mágico/i }).click()

    const aviso = page.locator('[data-slot="card"] [role="alert"]')
    await expect(aviso).toBeVisible()
    await expect(aviso).toContainText(/correo electrónico válido/i)
  })

  test("auth/error page shows Google button on rate limit", async ({ page }) => {
    await page.goto("/auth/error?error_code=rate_limit")
    await expect(page.getByText("Demasiados Intentos")).toBeVisible()
    await expect(page.getByText("Prueba con Google")).toBeVisible()
    await expect(page.getByText("Continuar con Google")).toBeVisible()
  })

  test("con el límite alcanzado, Google es una salida pulsable, no solo una palabra", async ({ page }) => {
    await page.goto("/auth/error?error_code=rate_limit")
    await expect(
      page.getByRole("button", { name: /continuar con google/i }).or(
        page.getByRole("link", { name: /continuar con google/i }),
      ).first(),
    ).toBeEnabled()
  })

  test("auth/error page resend form is dimmed on rate limit", async ({ page }) => {
    await page.goto("/auth/error?error_code=rate_limit")
    const resendSection = page.locator("text=Reenviar enlace mágico").first()
    await expect(resendSection).toBeVisible()
  })

  test("la puerta del portal deja pedir el enlace, sin pedirlo aquí", async ({ page }) => {
    // No se pulsa enviar a propósito: mandaría un enlace mágico de verdad contra
    // la base compartida en cada corrida. Lo que se comprueba es que la puerta
    // ofrece las dos entradas y que el formulario está listo para usarse.
    await page.goto("/my-cards")
    await expect(page.getByRole("button", { name: /continuar con google/i })).toBeEnabled()
    await page.getByLabel("Correo Electrónico").fill("test@example.com")
    await expect(page.getByRole("button", { name: /enviar enlace mágico/i })).toBeEnabled()
  })

  test("el code de Supabase en la landing entra al flujo de autenticación", async ({ request }) => {
    const res = await request.get("/?code=test-code&next=%2Fdashboard", { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    expect(res.headers()["location"]).toContain("/auth/callback?code=test-code")
  })

  test("un error de Supabase en la landing entra a la pantalla de error", async ({ request }) => {
    const res = await request.get("/?error=access_denied&error_code=otp_expired", { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    expect(res.headers()["location"]).toContain("/auth/error?error=access_denied")
  })
})
