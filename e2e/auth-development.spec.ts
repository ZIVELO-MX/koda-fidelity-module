import { test, expect, type Page, type APIRequestContext } from "@playwright/test"

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "fidelity.seed.admin@dev.invalid"
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "ci-admin-password"
const SELLADOR_EMAIL = process.env.E2E_SELLADOR_EMAIL ?? "fidelity.seed.sellador@dev.invalid"
const SELLADOR_PASSWORD = process.env.E2E_SELLADOR_PASSWORD ?? "ci-sellador-password"
const REQUIRED_EMAIL = process.env.E2E_REQUIRED_EMAIL ?? "fidelity.seed.required@dev.invalid"
const REQUIRED_PASSWORD = process.env.E2E_REQUIRED_PASSWORD ?? "ci-required-password"
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324"

async function login(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await page.getByLabel("Contraseña").fill(password)
  await page.getByRole("button", { name: "Iniciar Sesión" }).click()
  await page.waitForURL("**/dashboard", { timeout: 15000 })
}

async function loginExpectingPasswordSetup(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await page.getByLabel("Contraseña").fill(password)
  await page.getByRole("button", { name: "Iniciar Sesión" }).click()
  await page.waitForURL("**/dashboard/update-password", { timeout: 15000 })
}

async function waitForRecoveryLink(request: APIRequestContext, email: string) {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    const search = await request.get(`${MAILPIT_URL}/api/v1/search`, {
      params: { query: `to:${email}`, limit: "20" },
    })
    expect(search.ok()).toBeTruthy()
    const result = await search.json() as { messages?: Array<{ ID: string; Subject?: string }> }

    for (const message of result.messages ?? []) {
      const full = await request.get(`${MAILPIT_URL}/api/v1/message/${message.ID}`)
      expect(full.ok()).toBeTruthy()
      const body = await full.json() as { Text?: string; HTML?: string }
      const content = `${body.Text ?? ""}\n${body.HTML ?? ""}`
      const links = content.match(/https?:\/\/[^\s"'<>]+/g) ?? []
      const link = links.find(candidate => candidate.includes("/auth/v1/verify")) ?? links[0]
      if (link) return link.replaceAll("&amp;", "&")
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error("Timed out waiting for the recovery email in Mailpit")
}

async function apiJson(page: Page, url: string, init: RequestInit) {
  return page.evaluate(async ({ url, init }) => {
    const response = await fetch(url, init)
    return { status: response.status, body: await response.json() }
  }, { url, init })
}

test.describe("FID-0016 development authentication", () => {
  test("admin login, session reload and invalid password", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible()

    await page.reload()
    await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible()

    await page.getByRole("button", { name: "Cerrar Sesión" }).click()
    await page.waitForURL("**/login")
    await page.goto("/dashboard")
    await page.waitForURL("**/login")

    await page.getByLabel("Correo electrónico").fill(ADMIN_EMAIL)
    await page.getByRole("button", { name: "Continuar", exact: true }).click()
    await page.getByLabel("Contraseña").fill("definitely-wrong-password")
    await page.getByRole("button", { name: "Iniciar Sesión" }).click()
    await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible()
  })

  test("refreshes a session after the short CI token expires", async ({ page }) => {
    test.setTimeout(100000)
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.waitForTimeout(65000)
    await page.reload()
    await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible()
  })

  test("admin can invite a member and sellador receives 403", async ({ page, context }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    const adminResponse = await apiJson(page, "/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "fidelity.e2e.member@dev.invalid", name: "FID E2E Member", role: "sellador" }),
    })
    expect(adminResponse.status).toBe(202)

    const selladorPage = await context.newPage()
    await login(selladorPage, SELLADOR_EMAIL, SELLADOR_PASSWORD)
    const selladorResponse = await apiJson(selladorPage, "/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "fidelity.e2e.denied@dev.invalid", name: "Denied", role: "admin" }),
    })
    expect(selladorResponse.status).toBe(403)
    await selladorPage.close()
  })

  test("required-password user is redirected and must confirm the new password", async ({ page }) => {
    await loginExpectingPasswordSetup(page, REQUIRED_EMAIL, REQUIRED_PASSWORD)
    await page.getByLabel("Nueva contraseña").fill("ci-new-password-1")
    await page.getByLabel("Confirmar contraseña").fill("ci-new-password-2")
    await page.getByRole("button", { name: "Guardar y continuar" }).click()
    await expect(page.getByText("Las contraseñas no coinciden")).toBeVisible()

    await page.getByLabel("Nueva contraseña").fill("ci-new-password-2")
    await page.getByLabel("Confirmar contraseña").fill("ci-new-password-2")
    await page.getByRole("button", { name: "Guardar y continuar" }).click()
    await page.waitForURL("**/dashboard", { timeout: 15000 })
    await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible()
  })

  test("recovers password through the application and Mailpit", async ({ page, request }) => {
    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill(ADMIN_EMAIL)
    await page.getByRole("button", { name: "Continuar", exact: true }).click()
    await page.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click()
    await page.getByRole("button", { name: "Enviar correo de recuperación" }).click()
    await expect(page.getByText("Si el correo existe, recibirás un enlace para recuperar tu contraseña.")).toBeVisible()

    const recoveryLink = await waitForRecoveryLink(request, ADMIN_EMAIL)
    await page.goto(recoveryLink)
    await page.waitForURL("**/dashboard/update-password", { timeout: 15000 })
    await page.getByLabel("Nueva contraseña").fill("ci-recovered-password-2")
    await page.getByLabel("Confirmar contraseña").fill("ci-recovered-password-2")
    await page.getByRole("button", { name: "Guardar y continuar" }).click()
    await page.waitForURL("**/dashboard", { timeout: 15000 })

    await page.getByRole("button", { name: "Cerrar Sesión" }).click()
    await page.waitForURL("**/login")
    await login(page, ADMIN_EMAIL, "ci-recovered-password-2")
  })
})
