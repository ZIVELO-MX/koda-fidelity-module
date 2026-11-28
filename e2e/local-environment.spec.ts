import { randomUUID } from "node:crypto"
import { PrismaClient } from "@prisma/client"
import { expect, test } from "@playwright/test"
import sharp from "sharp"

test.skip(process.env.KODA_LOCAL_ENVIRONMENT !== "true", "Ejecutar con pnpm local:test")

test("el cliente se inscribe y el operador sella y canjea en Supabase local", async ({ page, browser, request }) => {
  const preview = await request.get("/opengraph-image")
  expect(preview.ok()).toBeTruthy()
  expect(preview.headers()["content-type"]).toContain("image/png")

  const id = randomUUID()
  const email = `cliente-${id}@example.com`
  const name = `Cliente local ${id.slice(0, 8)}`
  const cardId = "card-local-fidelity"

  await page.goto(`/join/${cardId}`)
  await page.getByLabel("Tu Nombre").fill(name)
  await page.getByLabel("Correo Electrónico").fill(email)
  await page.getByRole("button", { name: "Continuar al registro" }).click()
  await page.getByLabel("Contraseña", { exact: true }).fill("ClienteLocal123!")
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill("ClienteLocal123!")
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click()

  const lookup = () => page.request.get("/api/join", { params: { email, cardId } })
  await expect.poll(async () => {
    const response = await lookup()
    return response.ok() ? (await response.json()).customers.length : response.status()
  }, { timeout: 15000 }).toBe(1)
  const { customers: [customer] } = await (await lookup()).json()
  expect(customer.stamps).toBe(0)

  const stamp = { headers: { "Idempotency-Key": randomUUID() }, data: { customerId: customer.id, type: "stamp" } }
  expect((await request.post("/api/stamps", stamp)).status()).toBe(401)
  expect((await page.request.post("/api/stamps", stamp)).status()).toBe(404)
  expect((await (await lookup()).json()).customers[0].stamps).toBe(0)

  const operator = await browser.newPage()
  try {
    await operator.goto("/login")
    await operator.getByLabel("Correo electrónico").fill("operator.local@dev.invalid")
    await operator.getByRole("button", { name: "Continuar", exact: true }).click()
    await operator.locator('input[name="password"]').fill("KodaLocal123!")
    await operator.getByRole("button", { name: "Iniciar sesión" }).click()
    await expect(operator.getByRole("heading", { name: "Panel" })).toBeVisible()
    await operator.reload()
    await expect(operator.getByRole("heading", { name: "Panel" })).toBeVisible()

    const operation = (type: "stamp" | "redeem", id = randomUUID()) => operator.request.post("/api/stamps", {
      headers: { "Idempotency-Key": id },
      data: { customerId: customer.id, type },
    })
    const stampId = randomUUID()
    for (const [type, balance, id] of [
      ["stamp", 1, stampId],
      ["stamp", 1, stampId],
      ["stamp", 2, randomUUID()],
      ["redeem", 0, randomUUID()],
    ] as const) {
      const response = await operation(type, id)
      expect(response.ok(), await response.text()).toBeTruthy()
      expect((await response.json()).customer.stamps).toBe(balance)
    }

    const response = await lookup()
    expect(response.ok()).toBeTruthy()
    expect((await response.json()).customers).toEqual([
      expect.objectContaining({ id: customer.id, stamps: 0 }),
    ])

    await operator.goto("/dashboard/customers")
    await operator.getByRole("button", { name: `Más acciones para ${name}` }).click()
    await operator.getByRole("menuitem", { name: "Corregir correo" }).click()
    await operator.getByLabel("Correo electrónico").fill(`corregido-${id}@example.com`)
    await operator.getByRole("button", { name: "Guardar correo" }).click()
    await expect(operator.getByText("Correo corregido", { exact: true })).toBeVisible()
    expect((await (await lookup()).json()).customers).toEqual([])
  } finally {
    await operator.close()
  }
})

test("el cliente puede subir y quitar un avatar en Storage local", async ({ page }) => {
  const email = `avatar-${randomUUID()}@example.com`
  await page.goto("/signup")
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill("ClienteLocal123!")
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill("ClienteLocal123!")
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await page.getByText("Soy un cliente", { exact: true }).click()
  await page.getByLabel("Tu nombre").fill("Cliente avatar")
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click()
  await page.waitForURL("**/dashboard/my-cards")

  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer()
  const upload = await page.request.put("/api/customer/profile/avatar", {
    multipart: { file: { name: "avatar.png", mimeType: "image/png", buffer: png } },
  })
  expect(upload.ok(), await upload.text()).toBeTruthy()
  const { signedUrl } = await upload.json()
  expect(new URL(signedUrl).origin).toBe(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const image = await page.request.get(signedUrl)
  expect(image.ok()).toBeTruthy()
  expect(image.headers()["content-type"]).toContain("image/webp")
  const removed = await page.request.delete("/api/customer/profile/avatar")
  expect(removed.ok(), await removed.text()).toBeTruthy()
  expect((await removed.json()).profile.avatarUrl).toBeNull()
  expect((await page.request.get(signedUrl)).ok()).toBeFalsy()
})

test("Auth entrega el correo de recuperación en Mailpit local", async ({ page, request }) => {
  const email = "operator.local@dev.invalid"
  const inbox = `${process.env.MAILPIT_URL}/api/v1/search`
  const messages = async () => {
    const response = await request.get(inbox, { params: { query: `to:${email}` } })
    expect(response.ok()).toBeTruthy()
    return (await response.json()).messages as { ID: string }[]
  }

  const existing = new Set((await messages()).map(message => message.ID))
  await page.goto("/login")
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await page.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click()
  await page.getByRole("button", { name: "Enviarme el enlace" }).click()
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible()

  await expect.poll(async () => {
    const message = (await messages()).find(candidate => !existing.has(candidate.ID))
    if (!message) return false
    const response = await request.get(`${process.env.MAILPIT_URL}/api/v1/message/${message.ID}`)
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    return String(body.HTML).includes("http://localhost:3000/auth/confirm")
  }).toBe(true)
})

test("el alta pública oculta los motivos comerciales y el formulario de tarjetas no disponibles", async ({ page, request }) => {
  const prisma = new PrismaClient()
  const cardIds: string[] = []
  const cases = [
    { status: "ARCHIVED", isActive: false, expiresAt: null, title: "Esta tarjeta no está disponible" },
    { status: "LOCKED_BY_PLAN", isActive: false, expiresAt: null, title: "Esta tarjeta no está disponible" },
    { status: "ACTIVE", isActive: true, expiresAt: new Date("2020-01-01"), title: "Esta tarjeta no está disponible por ahora" },
  ] as const
  try {
    for (const { title, ...state } of cases) {
      const card = await prisma.loyaltyCard.create({ data: {
        ...state, businessId: "business-local-fidelity", name: "Prueba de disponibilidad", reward: "Premio de prueba",
      } })
      cardIds.push(card.id)
      await page.goto(`/join/${card.id}`)
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible()
      await expect(page.getByLabel("Tu Nombre")).toHaveCount(0)
      const data = await request.get(`/api/cards/${card.id}`)
      expect(data.ok()).toBeTruthy()
      expect(await data.json()).toEqual({ card: { available: false, reason: state.expiresAt ? "vencida" : "no-disponible" } })
      const og = await request.get(`/join/${card.id}/opengraph-image`)
      expect(og.ok()).toBeTruthy()
      expect(og.headers()["content-type"]).toContain("image/png")
    }
  } finally {
    try {
      await prisma.loyaltyCard.deleteMany({ where: { id: { in: cardIds } } })
    } finally {
      await prisma.$disconnect()
    }
  }
})
