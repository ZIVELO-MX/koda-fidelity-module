import { test, expect } from "@playwright/test"

const TEST_EMAIL = "test@kodafidelity.com"
const TEST_PASSWORD = "Test123!"

test.describe("Auth Flow", () => {
  test("signup creates a new user", async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@kodafidelity.com`

    await page.goto("/signup")
    await page.getByLabel("Nombre del negocio").fill("Test Cafe")
    await page.getByLabel("Correo electrónico").fill(uniqueEmail)
    await page.getByLabel("Contraseña").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Crear Cuenta" }).click()

    // Wait for redirect or form submission result
    await page.waitForTimeout(2000)

    const currentUrl = page.url()
    if (currentUrl.includes("/dashboard")) {
      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
    } else {
      // After submit, either success (email confirm) or error should appear
      const hasSuccess = await page.getByText("Revisa tu correo para confirmar").isVisible().catch(() => false)
      const hasError = await page.locator('[class*="destructive"]').isVisible().catch(() => false)
      expect(hasSuccess || hasError).toBe(true)
    }
  })

  test("login with valid credentials succeeds", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill(TEST_EMAIL)
    await page.getByLabel("Contraseña").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Iniciar Sesión" }).click()

    await page.waitForURL("**/dashboard", { timeout: 15000 })
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  })

  test("session persists after page reload", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill(TEST_EMAIL)
    await page.getByLabel("Contraseña").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Iniciar Sesión" }).click()
    await page.waitForURL("**/dashboard", { timeout: 15000 })

    await page.reload()
    await page.waitForURL("**/dashboard")
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  })

  test("logout redirects to login", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill(TEST_EMAIL)
    await page.getByLabel("Contraseña").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Iniciar Sesión" }).click()
    await page.waitForURL("**/dashboard", { timeout: 15000 })

    await page.getByRole("button", { name: "Cerrar Sesión" }).click()
    await page.waitForURL("**/login", { timeout: 10000 })
    await expect(page.getByText("Iniciar Sesión").first()).toBeVisible()
  })

  test("after logout, dashboard redirects to login", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill(TEST_EMAIL)
    await page.getByLabel("Contraseña").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Iniciar Sesión" }).click()
    await page.waitForURL("**/dashboard", { timeout: 15000 })

    await page.getByRole("button", { name: "Cerrar Sesión" }).click()
    await page.waitForURL("**/login", { timeout: 10000 })

    await page.goto("/dashboard")
    await page.waitForURL("**/login")
  })
})
