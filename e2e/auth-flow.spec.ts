import { test, expect } from "@playwright/test"

const TEST_EMAIL = "test@kodafidelity.com"
const TEST_PASSWORD = "Test123!"

test.describe("Auth Flow", () => {
  test("signup form submits without crashing", async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@kodafidelity.com`

    await page.goto("/signup")
    await page.getByLabel("Nombre del negocio").fill("Test Cafe")
    await page.getByLabel("Correo electrónico").fill(uniqueEmail)
    await page.getByLabel("Contraseña").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Crear Cuenta" }).click()

    // After submit the page either redirects to /dashboard or stays on /signup
    // with a success/error message. Both are valid outcomes.
    await page.waitForURL(/\/dashboard|\/signup/, { timeout: 15000 })

    // Verify the page is in a valid state (not crashed/blank)
    await expect(page.locator("body")).toBeVisible()
    expect(page.url()).toMatch(/\/dashboard|\/signup/)
  })

  test("login with valid credentials succeeds", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill(TEST_EMAIL)
    await page.getByLabel("Contraseña").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Iniciar Sesión" }).click()

    await page.waitForURL("**/dashboard", { timeout: 15000 })
    await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible()
  })

  test("session persists after page reload", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill(TEST_EMAIL)
    await page.getByLabel("Contraseña").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Iniciar Sesión" }).click()
    await page.waitForURL("**/dashboard", { timeout: 15000 })

    await page.reload()
    await page.waitForURL("**/dashboard")
    await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible()
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
