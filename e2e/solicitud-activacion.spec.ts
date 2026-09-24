import { test, expect, type Page } from "@playwright/test"
import { entrar } from "./sesion"

/**
 * FID-0028: solicitud manual de activación con folio.
 *
 * No hay proveedor de cobro y no se simula ninguna compra. Lo que se comprueba
 * es que pedir la activación **no** active nada: ni cobra, ni publica la
 * tarjeta, ni manda el correo por su cuenta.
 *
 * Lo que sólo depende de la interfaz corre siempre. Lo que necesita
 * `GET/POST /api/subscription-requests` se salta con su razón mientras el
 * backend no esté en esta rama, igual que se hizo con el catálogo de temas: una
 * prueba que se salta diciendo por qué es mejor que una que falla por la razón
 * equivocada.
 */
const CORREO = process.env.E2E_ONBOARDING_EMAIL
const CLAVE = process.env.E2E_ONBOARDING_PASSWORD ?? process.env.E2E_PORTAL_PASSWORD

const MEDIDAS = [
  { ancho: 375, alto: 812 },
  { ancho: 768, alto: 1024 },
  { ancho: 1440, alto: 900 },
]

async function enElMuro(page: Page) {
  await page.goto("/onboarding")
  await expect(page.locator("#contenido")).toBeVisible({ timeout: 60000 })
  return page.getByRole("heading", { name: "Publica tu tarjeta" }).isVisible().catch(() => false)
}

/** ¿Está el contrato de solicitudes en esta rama? */
async function hayContrato(page: Page) {
  const res = await page.request.get("/api/subscription-requests")
  return res.status() !== 404
}

test.describe("Solicitud manual de activación", () => {
  test.skip(!CORREO || !CLAVE, "Requiere las credenciales del fixture del alta")

  test("el muro pide activación, no contrata, y ofrece los dos planes", async ({ page }) => {
    await entrar(page, CORREO!, CLAVE!)
    if (!(await enElMuro(page))) test.skip(true, "La cuenta del fixture no está en el muro de pago")

    // Los dos planes se pueden solicitar desde el principio.
    await expect(page.getByRole("button", { name: /solicitar activación de lite/i })).toBeEnabled()
    await expect(page.getByRole("button", { name: /solicitar activación de pro/i })).toBeEnabled()

    // Y ya no se promete contratar ni se aplaza Pro al mes siguiente.
    await expect(page.getByRole("button", { name: /^contratar/i })).toHaveCount(0)
    await expect(page.getByText(/disponible al terminar tu primer mes/i)).toHaveCount(0)

    // Los precios aprobados siguen a la vista.
    await expect(page.getByText("1,490")).toBeVisible()
    await expect(page.getByText("2,990")).toBeVisible()
  })

  test("crear la solicitud enseña el folio, y el folio sobrevive a una recarga", async ({ page }) => {
    await entrar(page, CORREO!, CLAVE!)
    if (!(await enElMuro(page))) test.skip(true, "La cuenta del fixture no está en el muro de pago")
    test.skip(!(await hayContrato(page)), "Requiere FID-0028 en backend: /api/subscription-requests todavía no existe")

    await page.getByRole("button", { name: /solicitar activación de lite/i }).click()

    const folio = page.getByText(/^KF-/)
    await expect(folio).toBeVisible({ timeout: 30000 })
    const valor = (await folio.innerText()).trim()

    // Recargar recupera la misma solicitud: el folio no vive en el navegador.
    await page.reload()
    await expect(page.locator("#contenido")).toBeVisible({ timeout: 60000 })
    await expect(page.getByText(valor)).toBeVisible({ timeout: 30000 })
  })

  test("pedir la activación no publica la tarjeta ni manda el correo", async ({ page }) => {
    await entrar(page, CORREO!, CLAVE!)
    if (!(await enElMuro(page))) test.skip(true, "La cuenta del fixture no está en el muro de pago")
    test.skip(!(await hayContrato(page)), "Requiere FID-0028 en backend: /api/subscription-requests todavía no existe")

    await page.getByRole("button", { name: /solicitar activación de pro/i }).click()
    await expect(page.getByText(/^KF-/)).toBeVisible({ timeout: 30000 })

    // Lo que no pasó, dicho en la pantalla.
    await expect(page.getByText(/falta que tú mandes el correo/i)).toBeVisible()
    for (const promesa of [/no envía nada/i, /no cobra/i, /no activa tu plan/i, /no publica tu tarjeta/i]) {
      await expect(page.getByText(promesa)).toBeVisible()
    }

    // Y la tarjeta sigue sin publicar: el muro no se fue y sus acciones de QR
    // siguen desactivadas.
    await expect(page.getByRole("heading", { name: "Publica tu tarjeta" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Compartir", exact: true })).toHaveAttribute("aria-disabled", "true")
  })

  test("un error del servidor se explica y se puede reintentar", async ({ page }) => {
    await entrar(page, CORREO!, CLAVE!)
    if (!(await enElMuro(page))) test.skip(true, "La cuenta del fixture no está en el muro de pago")

    // Se fuerza el fallo en la red, que es lo que esta prueba quiere ver: que
    // la pantalla lo diga en vez de quedarse callada o inventar un folio.
    await page.route("**/api/subscription-requests", (ruta) =>
      ruta.fulfill({
        status: 500,
        contentType: "application/json",
        headers: { "x-request-id": "req-e2e-500" },
        body: JSON.stringify({ error: "Internal server error", code: "KF-SYS-001", action: "Inténtalo de nuevo más tarde.", requestId: "req-e2e-500", retryable: true }),
      }),
    )

    await page.getByRole("button", { name: /solicitar activación de lite/i }).click()
    const alerta = page.getByRole("alert")
    await expect(alerta).toBeVisible({ timeout: 30000 })
    await expect(alerta).toContainText("req-e2e-500")
    await expect(page.getByText(/^KF-/)).toHaveCount(0)

    // Y el botón queda listo para volver a intentarlo.
    await expect(page.getByRole("button", { name: /solicitar activación de lite/i })).toBeEnabled()
  })
})

for (const { ancho, alto } of MEDIDAS) {
  test.describe(`el muro con solicitud a ${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: alto } })
    test.skip(!CORREO || !CLAVE, "Requiere las credenciales del fixture del alta")

    test("los dos planes caben y se pueden accionar", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      if (!(await enElMuro(page))) test.skip(true, "La cuenta del fixture no está en el muro de pago")

      for (const plan of [/solicitar activación de lite/i, /solicitar activación de pro/i]) {
        const boton = page.getByRole("button", { name: plan })
        await expect(boton).toBeVisible()
        const caja = await boton.boundingBox()
        expect(caja?.height ?? 0, `${plan} a ${ancho}px`).toBeGreaterThanOrEqual(44)
      }

      const desborda = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      )
      expect(desborda, `el muro desborda a ${ancho}px`).toBe(false)
    })
  })
}
