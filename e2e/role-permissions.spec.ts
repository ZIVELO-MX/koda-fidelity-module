import { test, expect } from "@playwright/test"

const roleUsers = [
  { role: "admin", email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD, usersStatus: 200 },
  { role: "sellador", email: process.env.E2E_SELLADOR_EMAIL, password: process.env.E2E_SELLADOR_PASSWORD, usersStatus: 403 },
]

test("development users can sign in and receive the expected permissions", async ({ browser }) => {
  for (const user of roleUsers) {
    if (!user.email || !user.password) throw new Error(`Missing E2E credentials for ${user.role}`)

    const context = await browser.newContext({ locale: "es-MX" })
    const page = await context.newPage()
    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill(user.email)
    await page.getByRole("button", { name: "Continuar", exact: true }).click()
    await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(user.password)
    await page.getByRole("button", { name: "Iniciar Sesión" }).click()
    await page.waitForURL("**/dashboard")

    const businessResponse = await page.request.get("/api/business")
    const usersResponse = await page.request.get("/api/users")
    expect(businessResponse.status(), `${user.role} business access`).toBe(200)
    expect(usersResponse.status(), `${user.role} team access`).toBe(user.usersStatus)

    await context.close()
  }
})
