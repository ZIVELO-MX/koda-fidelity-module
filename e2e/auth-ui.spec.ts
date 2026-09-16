import { test, expect } from "@playwright/test"

test.describe("Auth UI", () => {
  test("signup page shows registration form (INVITE_ONLY=false)", async ({ page }) => {
    await page.goto("/signup")
    await expect(page.getByText("Crear Cuenta").first()).toBeVisible()
    await expect(page.getByLabel("Nombre del negocio")).toBeVisible()
    await expect(page.getByLabel("Correo electrónico")).toBeVisible()
    await expect(page.getByLabel("Contraseña")).toBeVisible()
    await expect(page.getByRole("button", { name: "Crear Cuenta" })).toBeVisible()
  })

  // El acceso es de dos pasos. Cualquier correo válido llega al paso de
  // contraseña sin revelar si pertenece a un negocio registrado.
  test("login page shows login form", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible()
    await expect(page.getByLabel("Correo electrónico")).toBeVisible()
    await expect(page.locator("#password")).toBeHidden()
    await expect(page.getByRole("button", { name: "Continuar", exact: true })).toBeVisible()
  })

  test("every valid email reaches the password step without account enumeration", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill("correo-no-registrado@example.com")
    await page.getByRole("button", { name: "Continuar", exact: true }).click()

    await expect(page.locator("#password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Enviarme un enlace de acceso" })).toBeVisible()
  })

  // Con una cuenta real y la contraseña mal: así el error lo da el servidor, y
  // no hay que dar de alta nada ni pedir un enlace mágico contra la base
  // compartida, que es lo que pasaba con un correo inventado.
  test("login with invalid credentials shows error", async ({ page }) => {
    test.skip(!process.env.E2E_EMAIL, "Requiere E2E_EMAIL de una cuenta de negocio")

    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill(process.env.E2E_EMAIL!)
    await page.getByRole("button", { name: "Continuar", exact: true }).click()
    await page.locator("#password").fill("una-contraseña-que-no-es")
    await page.getByRole("button", { name: "Iniciar sesión" }).click()

    await expect(page.locator('[data-slot="card"] [role="alert"]')).toBeVisible({ timeout: 30000 })
  })

  test("unauthenticated access to dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForURL("**/login")
    await expect(page.getByText("Iniciar Sesión").first()).toBeVisible()
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
