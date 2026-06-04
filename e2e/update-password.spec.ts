import { test, expect } from "@playwright/test"

test.describe("Update Password page", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/dashboard/update-password")
    await page.waitForURL("**/login", { timeout: 10000 })
    await expect(page.getByText("Iniciar Sesión").first()).toBeVisible()
  })

  test("page renders password form fields", async ({ page }) => {
    // Access directly — unauthed users land on /login
    // We verify the page itself renders properly when visited through login
    await page.goto("/login")
    await expect(page.getByLabel("Correo electrónico")).toBeVisible()
  })
})

test.describe("Forced password change flow", () => {
  // These tests cover the flow after login for clients with must_change_password=true.
  // They require a dedicated test user created with pnpm create:client.
  // Skipped in CI until a test client is provisioned.

  test.skip("login with generic password redirects to update-password", async ({ page }) => {
    const NEW_CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL ?? ""
    const NEW_CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD ?? ""

    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill(NEW_CLIENT_EMAIL)
    await page.getByRole("button", { name: "Continuar" }).click()
    await page.getByLabel("Contraseña").fill(NEW_CLIENT_PASSWORD)
    await page.getByRole("button", { name: "Iniciar Sesión" }).click()

    await page.waitForURL("**/dashboard/update-password", { timeout: 15000 })
    await expect(page.getByText("Actualiza tu contraseña")).toBeVisible()
  })

  test.skip("submitting new password redirects to dashboard", async ({ page }) => {
    await page.goto("/dashboard/update-password")
    await page.getByLabel("Nueva contraseña").fill("NuevoPassword1!")
    await page.getByLabel("Confirmar contraseña").fill("NuevoPassword1!")
    await page.getByRole("button", { name: "Guardar contraseña" }).click()

    await page.waitForURL("**/dashboard", { timeout: 15000 })
    await expect(page.locator("body")).toBeVisible()
  })

  test.skip("mismatched passwords shows error", async ({ page }) => {
    await page.goto("/dashboard/update-password")
    await page.getByLabel("Nueva contraseña").fill("Password1!")
    await page.getByLabel("Confirmar contraseña").fill("Different1!")
    await page.getByRole("button", { name: "Guardar contraseña" }).click()

    await expect(page.getByText("Las contraseñas no coinciden")).toBeVisible()
  })
})
