import { test, expect } from "@playwright/test"
import { entrar } from "./sesion"

/**
 * El recorrido completo del alta, con fixture determinista.
 *
 * Arranca siempre igual porque `pnpm prepare:onboarding-e2e` deja el alta de la
 * cuenta de pruebas en el primer paso con los borradores vacíos. Sin esa
 * preparación estas pruebas no corren: prefiero que no existan a que pasen por
 * casualidad sobre un estado cualquiera.
 *
 * Llega hasta el muro de pago, que es donde termina lo que se puede validar sin
 * proveedor de cobro. No se simula ninguna compra.
 */
const CORREO = process.env.E2E_ONBOARDING_EMAIL
const CLAVE = process.env.E2E_ONBOARDING_PASSWORD

test.describe("Alta guiada, recorrido completo", () => {
  test.skip(
    !CORREO || !CLAVE,
    "Requiere E2E_ONBOARDING_EMAIL y E2E_ONBOARDING_PASSWORD, y `pnpm prepare:onboarding-e2e` antes",
  )

  test.beforeEach(async ({ page }) => {
    await entrar(page, CORREO!, CLAVE!)
    await page.goto("/onboarding")
    await expect(page.locator("#contenido")).toBeVisible({ timeout: 60000 })
  })

  test("va de la intro al muro de pago guardando cada paso en el servidor", async ({ page }) => {
    // Intro: se puede saltar desde la primera lámina.
    await expect(page.getByRole("button", { name: "Saltar la introducción" })).toBeVisible()
    await page.getByRole("button", { name: "Saltar la introducción" }).click()

    // Datos: sin nombre ni categoría el servidor no deja avanzar, y se dice.
    await expect(page.getByRole("heading", { name: "Tu negocio" })).toBeVisible()
    await page.getByRole("button", { name: "Continuar" }).click()
    await expect(page.locator("#contenido [role='alert']").or(page.locator("[role='alert']").first())).toBeVisible()

    const nombre = `Café Aurora ${Date.now()}`
    await page.getByLabel("Nombre del negocio").fill(nombre)
    // Las categorías las sirve el backend: se toma la primera que pinte.
    const categoria = page.locator("fieldset button").first()
    await categoria.click()
    await page.getByRole("button", { name: "Continuar" }).click()

    // Tarjeta: la vista previa sigue lo que se escribe.
    await expect(page.getByRole("heading", { name: "Tu primera tarjeta" })).toBeVisible({ timeout: 30000 })
    await page.getByRole("button", { name: "8", exact: true }).click()
    await page.getByLabel("Recompensa").fill("Décimo café gratis")
    await expect(page.getByText("0/8")).toBeVisible()
    await page.getByRole("button", { name: "Continuar" }).click()

    // El club, con su nombre y la tarjeta vacía. Va antes del muro.
    await expect(page.getByRole("heading", { name: `Club ${nombre}` })).toBeVisible({ timeout: 30000 })
    await expect(page.getByText("Así lo verán tus clientes.")).toBeVisible()
    await page.getByRole("button", { name: "Continuar" }).click()

    // Origen: se puede saltar y nunca bloquea.
    await expect(page.getByRole("heading", { name: /cómo llegaste/i })).toBeVisible()
    await page.getByRole("button", { name: "Saltar", exact: true }).click()

    // Muro de pago.
    await expect(page.getByRole("heading", { name: "Publica tu tarjeta" })).toBeVisible({ timeout: 30000 })
    await expect(page.getByRole("radio", { name: /al año/i })).toBeChecked()
    await expect(page.getByRole("link", { name: "Salir sin publicar" })).toBeVisible()
  })

  test("la primera tarjeta se crea una sola vez, aunque se vuelva a pasar", async ({ page }) => {
    await page.getByRole("button", { name: "Saltar la introducción" }).click()
    await page.getByLabel("Nombre del negocio").fill("Café Aurora")
    await page.locator("fieldset button").first().click()
    await page.getByRole("button", { name: "Continuar" }).click()

    await expect(page.getByRole("heading", { name: "Tu primera tarjeta" })).toBeVisible({ timeout: 30000 })
    await page.getByLabel("Recompensa").fill("Décimo café gratis")

    const primera = page.waitForResponse((r) => r.url().includes("/api/onboarding") && r.request().method() === "POST")
    await page.getByRole("button", { name: "Continuar" }).click()
    const idPrimera = (await (await primera).json())?.onboarding?.onboardingProgress?.firstCardId
    expect(idPrimera, "completar la tarjeta tiene que dejar una firstCardId").toBeTruthy()

    // Volver atrás y repetir no puede crear una segunda.
    await page.goto("/onboarding")
    const relectura = await (await page.waitForResponse(
      (r) => r.url().includes("/api/onboarding") && r.request().method() === "GET",
    )).json()
    expect(relectura?.onboarding?.onboardingProgress?.firstCardId).toBe(idPrimera)
  })

  test("un borrador viejo no pisa lo que ya se guardó", async ({ page }) => {
    await page.getByRole("button", { name: "Saltar la introducción" }).click()
    await page.getByLabel("Nombre del negocio").fill("Primero")
    await page.waitForResponse((r) => r.url().includes("/api/onboarding") && r.request().method() === "PATCH" && r.ok())

    // Una escritura con una versión ya consumida tiene que ser rechazada.
    const respuesta = await page.request.patch("/api/onboarding", {
      data: { draftVersion: 0, business: { name: "Viejo" } },
    })
    expect(respuesta.status(), "draftVersion obsoleta debe dar 409").toBe(409)

    await page.reload()
    await expect(page.getByLabel("Nombre del negocio")).toHaveValue("Primero", { timeout: 60000 })
  })
})
