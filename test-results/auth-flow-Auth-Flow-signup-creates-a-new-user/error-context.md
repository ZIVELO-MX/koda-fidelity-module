# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flow.spec.ts >> Auth Flow >> signup creates a new user
- Location: e2e/auth-flow.spec.ts:7:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e7]: K
      - generic [ref=e8]: Crear Cuenta
      - generic [ref=e9]: Registra tu negocio en Koda Fidelity
    - generic [ref=e11]:
      - generic [ref=e12]: email rate limit exceeded
      - generic [ref=e13]:
        - generic [ref=e14]: Nombre del negocio
        - textbox "Nombre del negocio" [ref=e15]:
          - /placeholder: Mi Cafetería
      - generic [ref=e16]:
        - generic [ref=e17]: Correo electrónico
        - textbox "Correo electrónico" [ref=e18]:
          - /placeholder: tu@correo.com
      - generic [ref=e19]:
        - generic [ref=e20]: Contraseña
        - textbox "Contraseña" [ref=e21]:
          - /placeholder: ••••••••
      - button "Crear Cuenta" [ref=e22]
    - generic [ref=e24]:
      - text: ¿Ya tienes cuenta?
      - link "Iniciar Sesión" [ref=e25] [cursor=pointer]:
        - /url: /login
  - button "Open Next.js Dev Tools" [ref=e31] [cursor=pointer]:
    - img [ref=e32]
  - alert [ref=e35]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test"
  2  | 
  3  | const TEST_EMAIL = "test@kodafidelity.com"
  4  | const TEST_PASSWORD = "Test123!"
  5  | 
  6  | test.describe("Auth Flow", () => {
  7  |   test("signup creates a new user", async ({ page }) => {
  8  |     const uniqueEmail = `test-${Date.now()}@kodafidelity.com`
  9  | 
  10 |     await page.goto("/signup")
  11 |     await page.getByLabel("Nombre del negocio").fill("Test Cafe")
  12 |     await page.getByLabel("Correo electrónico").fill(uniqueEmail)
  13 |     await page.getByLabel("Contraseña").fill(TEST_PASSWORD)
  14 |     await page.getByRole("button", { name: "Crear Cuenta" }).click()
  15 | 
  16 |     // Wait for redirect or form submission result
  17 |     await page.waitForTimeout(2000)
  18 | 
  19 |     const currentUrl = page.url()
  20 |     if (currentUrl.includes("/dashboard")) {
  21 |       await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  22 |     } else {
  23 |       // After submit, either success (email confirm) or error should appear
  24 |       const hasSuccess = await page.getByText("Revisa tu correo para confirmar").isVisible().catch(() => false)
  25 |       const hasError = await page.locator('[class*="destructive"]').isVisible().catch(() => false)
> 26 |       expect(hasSuccess || hasError).toBe(true)
     |                                      ^ Error: expect(received).toBe(expected) // Object.is equality
  27 |     }
  28 |   })
  29 | 
  30 |   test("login with valid credentials succeeds", async ({ page }) => {
  31 |     await page.goto("/login")
  32 |     await page.getByLabel("Correo electrónico").fill(TEST_EMAIL)
  33 |     await page.getByLabel("Contraseña").fill(TEST_PASSWORD)
  34 |     await page.getByRole("button", { name: "Iniciar Sesión" }).click()
  35 | 
  36 |     await page.waitForURL("**/dashboard", { timeout: 15000 })
  37 |     await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  38 |   })
  39 | 
  40 |   test("session persists after page reload", async ({ page }) => {
  41 |     await page.goto("/login")
  42 |     await page.getByLabel("Correo electrónico").fill(TEST_EMAIL)
  43 |     await page.getByLabel("Contraseña").fill(TEST_PASSWORD)
  44 |     await page.getByRole("button", { name: "Iniciar Sesión" }).click()
  45 |     await page.waitForURL("**/dashboard", { timeout: 15000 })
  46 | 
  47 |     await page.reload()
  48 |     await page.waitForURL("**/dashboard")
  49 |     await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  50 |   })
  51 | 
  52 |   test("logout redirects to login", async ({ page }) => {
  53 |     await page.goto("/login")
  54 |     await page.getByLabel("Correo electrónico").fill(TEST_EMAIL)
  55 |     await page.getByLabel("Contraseña").fill(TEST_PASSWORD)
  56 |     await page.getByRole("button", { name: "Iniciar Sesión" }).click()
  57 |     await page.waitForURL("**/dashboard", { timeout: 15000 })
  58 | 
  59 |     await page.getByRole("button", { name: "Cerrar Sesión" }).click()
  60 |     await page.waitForURL("**/login", { timeout: 10000 })
  61 |     await expect(page.getByText("Iniciar Sesión").first()).toBeVisible()
  62 |   })
  63 | 
  64 |   test("after logout, dashboard redirects to login", async ({ page }) => {
  65 |     await page.goto("/login")
  66 |     await page.getByLabel("Correo electrónico").fill(TEST_EMAIL)
  67 |     await page.getByLabel("Contraseña").fill(TEST_PASSWORD)
  68 |     await page.getByRole("button", { name: "Iniciar Sesión" }).click()
  69 |     await page.waitForURL("**/dashboard", { timeout: 15000 })
  70 | 
  71 |     await page.getByRole("button", { name: "Cerrar Sesión" }).click()
  72 |     await page.waitForURL("**/login", { timeout: 10000 })
  73 | 
  74 |     await page.goto("/dashboard")
  75 |     await page.waitForURL("**/login")
  76 |   })
  77 | })
  78 | 
```