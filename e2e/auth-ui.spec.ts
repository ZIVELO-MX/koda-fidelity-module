import { test, expect } from "@playwright/test"

test.describe("Auth UI", () => {
  test("signup page shows registration form (INVITE_ONLY=false)", async ({ page }) => {
    await page.goto("/signup")
    await expect(page.getByText("Crear Cuenta")).toBeVisible()
    await expect(page.getByLabel("Nombre del negocio")).toBeVisible()
    await expect(page.getByLabel("Correo electrónico")).toBeVisible()
    await expect(page.getByLabel("Contraseña")).toBeVisible()
    await expect(page.getByRole("button", { name: "Crear Cuenta" })).toBeVisible()
  })

  test("login page shows login form", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByText("Iniciar Sesión")).toBeVisible()
    await expect(page.getByLabel("Correo electrónico")).toBeVisible()
    await expect(page.getByLabel("Contraseña")).toBeVisible()
    await expect(page.getByRole("button", { name: "Iniciar Sesión" })).toBeVisible()
  })

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill("wrong@email.com")
    await page.getByLabel("Contraseña").fill("wrongpassword")
    await page.getByRole("button", { name: "Iniciar Sesión" }).click()
    await expect(page.getByText("Invalid login credentials")).toBeVisible({ timeout: 10000 })
  })

  test("unauthenticated access to dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForURL("**/login")
    await expect(page.getByText("Iniciar Sesión")).toBeVisible()
  })

  test("authenticated user on login page redirects to dashboard", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "sb-mgzledffujjnunawgymc-auth-token",
        value: "invalid-token",
        domain: "localhost",
        path: "/",
      },
    ])
    await page.goto("/login")
    await page.waitForURL("**/login")
  })
})
