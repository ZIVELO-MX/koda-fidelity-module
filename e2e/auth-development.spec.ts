import { test, expect, type Page, type APIRequestContext } from "@playwright/test"
import { PrismaClient } from "@prisma/client"

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "fidelity.seed.admin@dev.invalid"
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "ci-admin-password"
const SELLADOR_EMAIL = process.env.E2E_SELLADOR_EMAIL ?? "fidelity.seed.sellador@dev.invalid"
const SELLADOR_PASSWORD = process.env.E2E_SELLADOR_PASSWORD ?? "ci-sellador-password"
const REQUIRED_EMAIL = process.env.E2E_REQUIRED_EMAIL ?? "fidelity.seed.required@dev.invalid"
const REQUIRED_PASSWORD = process.env.E2E_REQUIRED_PASSWORD ?? "ci-required-password"
const CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL ?? "fidelity.seed.customer@dev.invalid"
const EXPIRED_EMAIL = process.env.E2E_EXPIRED_EMAIL ?? "fidelity.seed.expired@dev.invalid"
const EXPIRED_PASSWORD = process.env.E2E_EXPIRED_PASSWORD ?? "ci-expired-password"
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324"

async function login(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole("button", { name: "Iniciar Sesión" }).click()
  await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible({ timeout: 15000 })
}

async function loginExpectingPasswordSetup(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole("button", { name: "Iniciar Sesión" }).click()
  await page.waitForURL("**/dashboard/update-password", { timeout: 15000 })
}

async function mailpitMessageIds(request: APIRequestContext, email: string) {
  const search = await request.get(`${MAILPIT_URL}/api/v1/search`, { params: { query: `to:${email}`, limit: "100" } })
  expect(search.ok()).toBeTruthy()
  const result = await search.json() as { messages?: Array<{ ID: string }> }
  return new Set((result.messages ?? []).map(message => message.ID))
}

async function waitForRecoveryLink(request: APIRequestContext, email: string, previousIds: Set<string>) {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    const search = await request.get(`${MAILPIT_URL}/api/v1/search`, {
      params: { query: `to:${email}`, limit: "20" },
    })
    expect(search.ok()).toBeTruthy()
    const result = await search.json() as { messages?: Array<{ ID: string; Subject?: string }> }

    for (const message of result.messages ?? []) {
      if (previousIds.has(message.ID)) continue
      const full = await request.get(`${MAILPIT_URL}/api/v1/message/${message.ID}`)
      expect(full.ok()).toBeTruthy()
      const body = await full.json() as { Text?: string; HTML?: string }
      const content = `${body.Text ?? ""}\n${body.HTML ?? ""}`
      const links = content.match(/https?:\/\/[^\s"'<>]+/g) ?? []
      const link = links.find(candidate => candidate.includes("/auth/confirm?") && candidate.includes("token_hash=") && candidate.includes("type=recovery"))
      if (link) return link.replaceAll("&amp;", "&")
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error("Timed out waiting for the recovery email in Mailpit")
}

async function waitForMagicLink(request: APIRequestContext, email: string, previousIds: Set<string>) {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    const search = await request.get(`${MAILPIT_URL}/api/v1/search`, { params: { query: `to:${email}`, limit: "20" } })
    expect(search.ok()).toBeTruthy()
    const result = await search.json() as { messages?: Array<{ ID: string }> }
    for (const message of result.messages ?? []) {
      if (previousIds.has(message.ID)) continue
      const full = await request.get(`${MAILPIT_URL}/api/v1/message/${message.ID}`)
      expect(full.ok()).toBeTruthy()
      const body = await full.json() as { Text?: string; HTML?: string }
      const content = `${body.Text ?? ""}\n${body.HTML ?? ""}`
      const link = (content.match(/https?:\/\/[^\s"'<>]+/g) ?? [])
        .find(candidate => candidate.includes("/auth/v1/verify") && candidate.includes("type=magiclink"))
      if (link) return link.replaceAll("&amp;", "&")
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error("Timed out waiting for the magic link in Mailpit")
}

async function ageRecoveryToken(email: string) {
  const prisma = new PrismaClient()
  try {
    const affected = await prisma.$executeRaw`UPDATE auth.users SET recovery_sent_at = now() - interval '2 hours' WHERE email = ${email} AND recovery_token <> ''`
    expect(affected).toBe(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function assertPasswordWorks(request: APIRequestContext, email: string, password: string) {
  const response = await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token`, {
    params: { grant_type: "password" },
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
    data: { email, password },
  })
  expect(response.ok(), await response.text()).toBeTruthy()
}

async function apiJson(page: Page, url: string, init: RequestInit) {
  return page.evaluate(async ({ url, init }) => {
    const response = await fetch(url, init)
    return { status: response.status, body: await response.json() }
  }, { url, init })
}

async function logout(page: Page) {
  await page.getByRole("button", { name: /Fidelity Seed|Fidelity Auth/ }).click()
  await page.getByRole("menuitem", { name: "Cerrar Sesión" }).click()
  await page.getByRole("button", { name: "Cerrar sesión" }).last().click()
  await page.waitForURL("**/login")
}

test.describe("FID-0016 development authentication", () => {
  test("admin login, session reload and invalid password", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible()

    await page.reload()
    await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible()

    await logout(page)
    await page.goto("/dashboard")
    await page.waitForURL("**/login")

    await page.getByLabel("Correo electrónico").fill(ADMIN_EMAIL)
    await page.getByRole("button", { name: "Continuar", exact: true }).click()
    await page.locator('input[name="password"]').fill("definitely-wrong-password")
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

  test("admin can invite a member and sellador receives 403", async ({ page, browser }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    const adminResponse = await apiJson(page, "/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: `fidelity.e2e.member-${Date.now()}@example.com`, name: "FID E2E Member", role: "sellador" }),
    })
    expect(adminResponse.status, JSON.stringify(adminResponse.body)).toBe(202)

    const selladorContext = await browser.newContext()
    const selladorPage = await selladorContext.newPage()
    await login(selladorPage, SELLADOR_EMAIL, SELLADOR_PASSWORD)
    const selladorResponse = await apiJson(selladorPage, "/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "fidelity.e2e.denied@dev.invalid", name: "Denied", role: "admin" }),
    })
    expect(selladorResponse.status).toBe(403)
    await selladorContext.close()
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
    await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible()
  })

  test("recovers password through the application and Mailpit", async ({ page, request }) => {
    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill(ADMIN_EMAIL)
    await page.getByRole("button", { name: "Continuar", exact: true }).click()
    await page.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click()
    const previousIds = await mailpitMessageIds(request, ADMIN_EMAIL)
    await page.getByRole("button", { name: "Enviar correo de recuperación" }).click()
    await expect(page.getByText("Si el correo existe, recibirás un enlace para recuperar tu contraseña.")).toBeVisible()

    const recoveryLink = await waitForRecoveryLink(request, ADMIN_EMAIL, previousIds)
    await page.goto(recoveryLink)
    await page.waitForURL("**/dashboard/update-password", { timeout: 15000 })
    await page.getByLabel("Nueva contraseña").fill("ci-recovered-password-2")
    await page.getByLabel("Confirmar contraseña").fill("ci-recovered-password-2")
    await page.getByRole("button", { name: "Guardar y continuar" }).click()
    await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible({ timeout: 15000 })

    await logout(page)
    await login(page, ADMIN_EMAIL, "ci-recovered-password-2")

    await page.goto(recoveryLink)
    await page.waitForURL("**/auth/error**", { timeout: 15000 })
  })

  test("rejects an expired recovery link without changing the password", async ({ page, request }) => {
    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill(EXPIRED_EMAIL)
    await page.getByRole("button", { name: "Continuar", exact: true }).click()
    await page.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click()
    const previousIds = await mailpitMessageIds(request, EXPIRED_EMAIL)
    await page.getByRole("button", { name: "Enviar correo de recuperación" }).click()
    await expect(page.getByText("Si el correo existe, recibirás un enlace para recuperar tu contraseña.")).toBeVisible()
    const recoveryLink = await waitForRecoveryLink(request, EXPIRED_EMAIL, previousIds)
    await ageRecoveryToken(EXPIRED_EMAIL)
    await page.goto(recoveryLink)
    await expect(page.getByText("Enlace Expirado")).toBeVisible({ timeout: 15000 })
    await assertPasswordWorks(request, EXPIRED_EMAIL, EXPIRED_PASSWORD)
  })

  test("auth-only customer reaches the portal with no cards or business", async ({ page, request }) => {
    await page.goto("/dashboard/my-cards")
    await page.getByLabel("Correo Electrónico").fill(CUSTOMER_EMAIL)
    const previousIds = await mailpitMessageIds(request, CUSTOMER_EMAIL)
    await page.getByRole("button", { name: "Enviar enlace mágico" }).click()
    await expect(page.getByText(`Te enviamos un enlace mágico a ${CUSTOMER_EMAIL}.`)).toBeVisible()
    const magicLink = await waitForMagicLink(request, CUSTOMER_EMAIL, previousIds)
    await page.goto(magicLink)
    await page.waitForURL("**/dashboard/my-cards", { timeout: 15000 })
    await expect(page.getByText("No tienes tarjetas de lealtad")).toBeVisible({ timeout: 15000 })
    const response = await apiJson(page, `/api/join?email=${encodeURIComponent(CUSTOMER_EMAIL)}`, { method: "GET" })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ customers: [] })
  })
})
