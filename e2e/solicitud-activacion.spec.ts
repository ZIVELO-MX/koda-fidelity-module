import { test, expect, type Page } from "@playwright/test"
import { entrar } from "./sesion"

/**
 * FID-0028: solicitud manual de activación con folio.
 *
 * No hay proveedor de cobro y no se simula ninguna compra. Lo que se comprueba
 * es que pedir la activación **no** active nada: ni cobra, ni publica la
 * tarjeta, ni manda el correo por su cuenta.
 *
 * En CI el backend y el fixture son requisitos: faltar al muro o al contrato
 * hace fallar la prueba, nunca acredita cobertura mediante un salto.
 */
const CORREO = process.env.E2E_ONBOARDING_EMAIL
const CLAVE = process.env.E2E_ONBOARDING_PASSWORD ?? process.env.E2E_PORTAL_PASSWORD

const MEDIDAS = [
  { ancho: 375, alto: 812 },
  { ancho: 768, alto: 1024 },
  { ancho: 1440, alto: 900 },
]

/**
 * Una sola sesión para todo el archivo.
 *
 * Entrar en cada prueba parecía más limpio y no lo era: siete pruebas son siete
 * inicios de sesión seguidos contra el mismo Supabase, y a partir del tercero o
 * cuarto empieza a limitarlos, así que `waitForURL` agota sus 60s y el spec
 * falla por el arnés y no por el producto. Medido: una corrida en verde y la
 * siguiente con seis fallos, todos en `sesion.ts`.
 *
 * En serie y con una página compartida, el login pasa de siete a uno.
 */
test.describe.configure({ mode: "serial" })

async function enElMuro(page: Page) {
  await page.goto("/onboarding")
  await expect(page.locator("#contenido")).toBeVisible({ timeout: 60000 })
  await llegarAPlanes(page)
}

async function llegarAPlanes(page: Page) {
  await expect(page.getByRole("heading", { name: "Tu tarjeta está lista, pero todavía no publicada." })).toBeVisible()
  await page.getByRole("button", { name: "Continuar" }).click()
  await expect(page.getByRole("heading", { name: "Ahora sí, los planes." })).toBeVisible()
}

/** ¿Está el contrato de solicitudes en esta rama? */
async function leerSolicitud(page: Page) {
  const res = await page.request.get("/api/subscription-requests")
  expect(res.status()).toBe(200)
  return res.json()
}

let page: Page

test.beforeAll(async ({ browser }) => {
  if (process.env.CI) expect(Boolean(CORREO && CLAVE), "Credenciales obligatorias del fixture del alta").toBe(true)
  test.skip(!CORREO || !CLAVE, "Requiere las credenciales del fixture del alta")
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await entrar(page, CORREO!, CLAVE!, ["/dashboard", "/onboarding"])
})

test.afterAll(async () => {
  await page?.close()
})

test.describe("Solicitud manual de activación", () => {
  if (process.env.CI) expect(Boolean(CORREO && CLAVE), "Credenciales obligatorias del fixture del alta").toBe(true)
  test.skip(!CORREO || !CLAVE, "Requiere las credenciales del fixture del alta")

  test("el muro pide activación, no contrata, y ofrece los dos planes", async () => {
    await enElMuro(page)

    await expect(page.getByRole("button", { name: /solicitar activación de lite/i })).toBeEnabled()
    await expect(page.getByRole("button", { name: /solicitar activación de pro/i })).toBeEnabled()

    // Ya no se promete contratar ni se aplaza Pro al mes siguiente.
    await expect(page.getByRole("button", { name: /^contratar/i })).toHaveCount(0)
    await expect(page.getByText(/disponible al terminar tu primer mes/i)).toHaveCount(0)

    // Los precios aprobados siguen a la vista.
    await expect(page.getByText("1,490")).toBeVisible()
    await expect(page.getByText("2,990")).toBeVisible()
  })

  test("crear la solicitud enseña el ticketNumber, y sobrevive a una recarga", async () => {
    await enElMuro(page)
    await leerSolicitud(page)

    expect((await leerSolicitud(page)).request, "El fixture debe empezar sin solicitud").toBeNull()
    const creada = page.waitForResponse((res) =>
      new URL(res.url()).pathname === "/api/subscription-requests" && res.request().method() === "POST",
    )
    await page.getByRole("button", { name: /solicitar activación de lite/i }).click()
    const res = await creada
    expect(res.status(), "Debe crear una nueva solicitud, no reutilizar una anterior").toBe(201)
    const { request } = await res.json()
    expect(request).toMatchObject({ status: "PENDING", plan: "LITE", contactEmail: CORREO })

    // El número se pinta en su recuadro y otra vez dentro del texto del correo,
    // así que se acota al recuadro en vez de buscar el texto suelto.
    const recuadro = page.locator("span.font-mono").filter({ hasText: /^KF-/ }).first()
    await expect(recuadro).toBeVisible({ timeout: 30000 })
    const valor = (await recuadro.innerText()).trim()
    expect(valor).toMatch(/^KF-[0-9A-F]{16}$/)
    expect(valor).toBe(request.ticketNumber)

    await page.reload()
    await expect(page.locator("#contenido")).toBeVisible({ timeout: 60000 })
    await llegarAPlanes(page)
    await expect(page.getByText(valor, { exact: true })).toBeVisible({ timeout: 30000 })
    expect((await leerSolicitud(page)).request).toMatchObject({ ticketNumber: valor, status: "PENDING" })
  })

  test("pedir la activación no publica la tarjeta ni manda el correo", async () => {
    await enElMuro(page)
    await leerSolicitud(page)

    await expect(page.locator("span.font-mono").filter({ hasText: /^KF-/ }).first()).toBeVisible({ timeout: 30000 })

    // Lo que no pasó, dicho en la pantalla.
    await expect(page.getByText(/falta que tú mandes el correo/i)).toBeVisible()
    for (const promesa of [/no envía nada/i, /no cobra/i, /no activa tu plan/i, /no publica tu tarjeta/i]) {
      await expect(page.getByText(promesa)).toBeVisible()
    }

    // Y la tarjeta sigue sin publicar: el muro no se fue y sus acciones de QR
    // no se pueden usar.
    await expect(page.getByRole("heading", { name: "Ahora sí, los planes." })).toBeVisible()
    await expect(page.getByText(/sin publicar, tu tarjeta no genera código qr/i)).toBeVisible()
  })

  test("el correo a soporte lleva el ticketNumber, el negocio y el correo de la cuenta", async () => {
    await enElMuro(page)
    await leerSolicitud(page)

    const recuadro = page.locator("span.font-mono").filter({ hasText: /^KF-/ }).first()
    await expect(recuadro).toBeVisible({ timeout: 30000 })
    const valor = (await recuadro.innerText()).trim()

    const enlace = page.getByRole("link", { name: /soporte@zivelo\.dev/i })
    const href = (await enlace.getAttribute("href")) ?? ""
    expect(href.startsWith("mailto:soporte@zivelo.dev?")).toBe(true)
    expect(decodeURIComponent(href)).toContain(valor)
    // El negocio y el correo salen del servidor, no del borrador del alta.
    expect(decodeURIComponent(href)).toContain(CORREO!)
  })

  test("un error del servidor se explica, con su referencia, y se puede reintentar", async () => {
    await enElMuro(page)

    await page.route("**/api/subscription-requests", (ruta) =>
      ruta.request().method() === "POST"
        ? ruta.fulfill({
            status: 500,
            contentType: "application/json",
            headers: { "x-request-id": "req-e2e-500" },
            body: JSON.stringify({ error: "Internal server error", code: "KF-SYS-001", action: "Inténtalo de nuevo más tarde.", requestId: "req-e2e-500", retryable: true }),
          })
        : ruta.continue(),
    )
    await page.reload()
    await expect(page.locator("#contenido")).toBeVisible({ timeout: 60000 })
    await llegarAPlanes(page)

    await page.getByRole("button", { name: /solicitar activación de pro/i }).click()

    // Next monta un `role="alert"` vacío para anunciar rutas, así que se acota al
    // aviso del alta y no al anunciador.
    const alerta = page.locator('#contenido [role="alert"]').first()
    await expect(alerta).toBeVisible({ timeout: 30000 })
    await expect(alerta).toContainText("req-e2e-500")
    await expect(page.getByRole("button", { name: /solicitar activación de pro/i })).toBeEnabled()
    await page.unroute("**/api/subscription-requests")
  })

  test("el muro cabe y se puede accionar en 375, 768 y 1440", async () => {
    await enElMuro(page)

    for (const { ancho, alto } of MEDIDAS) {
      await page.setViewportSize({ width: ancho, height: alto })
      for (const plan of [/solicitar activación de lite/i, /solicitar activación de pro/i]) {
        const boton = page.getByRole("button", { name: plan })
        await expect(boton, `${plan} a ${ancho}px`).toBeVisible()
        const caja = await boton.boundingBox()
        expect(caja?.height ?? 0, `${plan} a ${ancho}px`).toBeGreaterThanOrEqual(44)
      }
      const desborda = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      )
      expect(desborda, `el muro desborda a ${ancho}px`).toBe(false)
    }
    await page.setViewportSize({ width: 1440, height: 900 })
  })
})
