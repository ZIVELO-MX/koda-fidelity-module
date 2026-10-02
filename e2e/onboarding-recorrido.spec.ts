import { test, expect, type BrowserContext } from "@playwright/test"
import { PrismaClient } from "@prisma/client"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
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
const CLAVE = process.env.E2E_ONBOARDING_PASSWORD ?? process.env.E2E_PORTAL_PASSWORD
const ejecutar = promisify(execFile)
const db = new PrismaClient()
let cookies: Awaited<ReturnType<BrowserContext["cookies"]>> = []

async function contarTarjetas() {
  const user = await db.user.findUnique({ where: { email: CORREO! }, select: { businessId: true } })
  if (!user?.businessId) throw new Error("La cuenta del fixture no tiene negocio")
  return db.loyaltyCard.count({ where: { businessId: user.businessId } })
}

test.describe("Alta guiada, recorrido completo", () => {
  if (process.env.CI) {
    expect(Boolean(CORREO && CLAVE), "Credenciales obligatorias del recorrido").toBe(true)
    expect(process.env.ALLOW_DESTRUCTIVE_SEED).toBe("true")
  }
  test.skip(
    !CORREO || !CLAVE,
    "Requiere E2E_ONBOARDING_EMAIL y E2E_ONBOARDING_PASSWORD, y `pnpm prepare:onboarding-e2e` antes",
  )
  test.skip(process.env.ALLOW_DESTRUCTIVE_SEED !== "true", "Este recorrido modifica solo el fixture de Supabase local")

  test.beforeAll(async ({ browser }) => {
    const contexto = await browser.newContext()
    try {
      const pagina = await contexto.newPage()
      await entrar(pagina, CORREO!, CLAVE!)
      cookies = await contexto.cookies()
    } finally { await contexto.close() }
  })

  test.beforeEach(async ({ page }) => {
    // El paso vive en Postgres: una página nueva o un login nuevo no lo reinician.
    // El preparador comprueba que las tres URLs apunten a servicios locales.
    await ejecutar(process.execPath, ["--import", "tsx", "scripts/prepare-onboarding-e2e.ts"], {
      env: { ...process.env, E2E_ONBOARDING_MODE: "fresh" },
    })
    await page.context().addCookies(cookies)
    await page.goto("/onboarding")
    await expect(page.locator("#contenido")).toBeVisible({ timeout: 60000 })
  })

  test.afterAll(async () => db.$disconnect())

  test("va de la intro al muro de pago guardando cada paso en el servidor", async ({ page }) => {
    // Intro: se puede saltar desde la primera lámina.
    await expect(page.getByRole("button", { name: "Saltar introducción" })).toBeVisible()
    await page.getByRole("button", { name: "Saltar introducción" }).click()

    // Datos: sin nombre ni categoría el servidor no deja avanzar, y se dice.
    await expect(page.getByRole("heading", { name: "Tu negocio" })).toBeVisible()
    await page.getByRole("button", { name: "Continuar" }).click()
    // La validación se presenta como toast y señala los campos que faltan.
    await expect(page.getByText(/Completa nombre y categoría del negocio/i)).toBeVisible()
    await expect(page.getByLabel("Nombre del negocio")).toHaveAttribute("aria-invalid", "true")

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
    await expect(page.getByText("3/8")).toBeVisible()
    await page.getByRole("button", { name: "Continuar" }).click()

    // La tarjeta y el QR ilustrativos se muestran antes del muro de pago.
    await expect(page.getByRole("heading", { name: "Tu tarjeta está lista, pero todavía no publicada." })).toBeVisible({ timeout: 30000 })
    await expect(page.getByText(nombre, { exact: true })).toBeVisible()
    await expect(page.getByText("0/8")).toBeVisible()
    await page.getByRole("button", { name: "Continuar" }).click()

    // Origen: se puede saltar y nunca bloquea.
    await expect(page.getByRole("heading", { name: /cómo llegaste/i })).toBeVisible()
    await page.getByRole("button", { name: "Saltar", exact: true }).click()

    // Muro de pago.
    await expect(page.getByRole("heading", { name: "Ahora sí, los planes." })).toBeVisible({ timeout: 30000 })
    await expect(page.getByRole("radio", { name: /al año/i })).toBeChecked()
    await expect(page.getByRole("link", { name: "Salir sin publicar" })).toBeVisible()
  })

  test("la primera tarjeta se crea una sola vez, aunque se vuelva a pasar", async ({ page }) => {
    const antes = await (await page.request.get("/api/onboarding")).json()
    const yaHabiaTarjeta = Boolean(antes?.onboarding?.onboardingProgress?.firstCardId)
    const totalAntes = await contarTarjetas()

    await page.getByRole("button", { name: "Saltar introducción" }).click()
    await page.getByLabel("Nombre del negocio").fill("Café Aurora")
    await page.locator("fieldset button").first().click()
    await page.getByRole("button", { name: "Continuar" }).click()

    await expect(page.getByRole("heading", { name: "Tu primera tarjeta" })).toBeVisible({ timeout: 30000 })
    await page.getByLabel("Recompensa").fill("Décimo café gratis")

    const primera = page.waitForResponse((r) => r.url().includes("/api/onboarding") && r.request().method() === "POST")
    await page.getByRole("button", { name: "Continuar" }).click()
    const respuesta = await primera
    expect(respuesta.ok(), "complete_card debe guardar antes de comprobar firstCardId").toBe(true)
    const respuestaPrimera = await respuesta.json()
    const idPrimera = respuestaPrimera?.onboarding?.onboardingProgress?.firstCardId
    expect(idPrimera, "completar la tarjeta tiene que dejar una firstCardId").toBeTruthy()
    const totalTrasPrimera = await contarTarjetas()
    expect(totalTrasPrimera).toBe(totalAntes + (yaHabiaTarjeta ? 0 : 1))

    const segunda = await page.request.post("/api/onboarding", {
      data: { action: "complete_card", draftVersion: respuestaPrimera.onboarding.onboardingProgress.draftVersion },
    })
    expect(segunda.ok()).toBe(true)
    expect((await segunda.json())?.onboarding?.onboardingProgress?.firstCardId).toBe(idPrimera)
    expect(await contarTarjetas(), "repetir complete_card no crea otra tarjeta").toBe(totalTrasPrimera)

    // Una recarga sigue apuntando a la misma tarjeta.
    const relecturaPendiente = page.waitForResponse(
      (r) => r.url().includes("/api/onboarding") && r.request().method() === "GET",
    )
    await page.goto("/onboarding")
    const relectura = await (await relecturaPendiente).json()
    expect(relectura?.onboarding?.onboardingProgress?.firstCardId).toBe(idPrimera)
  })

  test("un borrador viejo no pisa lo que ya se guardó", async ({ page }) => {
    await page.getByRole("button", { name: "Saltar introducción" }).click()
    const guardado = page.waitForResponse((r) => r.url().includes("/api/onboarding") && r.request().method() === "PATCH" && r.ok())
    await page.getByLabel("Nombre del negocio").fill("Primero")
    await guardado

    // Una escritura con una versión ya consumida tiene que ser rechazada.
    const respuesta = await page.request.patch("/api/onboarding", {
      data: { draftVersion: 0, business: { name: "Viejo" } },
    })
    expect(respuesta.status(), "draftVersion obsoleta debe dar 409").toBe(409)

    await page.reload()
    await expect(page.getByLabel("Nombre del negocio")).toHaveValue("Primero", { timeout: 60000 })
  })

  /**
   * El autoguardado no servía de nada si no se veía. Estas tres cubren lo que
   * la persona necesita saber: que quedó, qué se recuperó al volver, y que no
   * se le promete nada que no esté.
   */
  test("al escribir se ve que guarda, y confirma que quedó", async ({ page }) => {
    await page.getByRole("button", { name: "Saltar introducción" }).click()
    await expect(page.getByRole("heading", { name: "Tu negocio" })).toBeVisible()

    await page.getByLabel("Nombre del negocio").fill(`Café Aurora ${Date.now()}`)

    // Primero lo dice, y después lo confirma. Un parpadeo sin confirmación deja
    // a la persona sin saber si se guardó.
    await expect(page.getByText("Guardando…")).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Guardado", { exact: true })).toBeVisible({ timeout: 30000 })
  })

  test("al volver se dice qué se recuperó, nombrando los campos", async ({ page }) => {
    await page.getByRole("button", { name: "Saltar introducción" }).click()
    const nombre = `Café Aurora ${Date.now()}`
    await page.getByLabel("Nombre del negocio").fill(nombre)
    await expect(page.getByText("Guardado", { exact: true })).toBeVisible({ timeout: 30000 })
    await page.locator("fieldset button").first().click()
    await page.getByRole("button", { name: "Continuar" }).click()
    await expect(page.getByRole("heading", { name: "Tu primera tarjeta" })).toBeVisible({ timeout: 30000 })

    await page.reload()
    await expect(page.locator("#contenido")).toBeVisible({ timeout: 60000 })

    const aviso = page.getByText(/retomamos donde lo dejaste/i)
    await expect(aviso).toBeVisible({ timeout: 30000 })
    // Nombra lo que hay, no un "tenemos tus datos" que invite a no revisar.
    await expect(page.getByText(/el nombre de tu negocio/i)).toBeVisible()

    // Y se puede quitar de en medio.
    await page.getByRole("button", { name: "Entendido" }).click()
    await expect(aviso).toHaveCount(0)
  })

  test("un alta recién empezada no anuncia que recuperó nada", async ({ page }) => {
    // El fixture deja el alta en el primer paso y sin borradores, así que no
    // hay nada que reanudar y no debe decirse que sí.
    await expect(page.getByText(/retomamos donde lo dejaste/i)).toHaveCount(0)
  })

  /**
   * La atribución es medición, así que se puede saltar y nunca bloquea. Lo que
   * no puede pasar es que saltarla deje una respuesta puesta: un número que
   * nadie contestó es peor que un hueco, porque se cuenta igual.
   */
  test("saltar la atribución no deja ninguna respuesta puesta", async ({ page }) => {
    await page.getByRole("button", { name: "Saltar introducción" }).click()
    await page.getByLabel("Nombre del negocio").fill(`Café Aurora ${Date.now()}`)
    await page.locator("fieldset button").first().click()
    await page.getByRole("button", { name: "Continuar" }).click()

    await expect(page.getByRole("heading", { name: "Tu primera tarjeta" })).toBeVisible({ timeout: 30000 })
    await page.getByLabel("Recompensa").fill("Un café de recompensa")
    await page.getByRole("button", { name: "Continuar" }).click()
    await expect(page.getByRole("heading", { name: "Tu tarjeta está lista, pero todavía no publicada." })).toBeVisible({ timeout: 30000 })
    await page.getByRole("button", { name: "Continuar" }).click()

    await expect(page.getByRole("heading", { name: /cómo llegaste a koda fidelity/i })).toBeVisible({ timeout: 30000 })
    // Las seis opciones acordadas, y ninguna marcada de entrada.
    const opciones = page.locator('button[aria-pressed]')
    expect(await opciones.count()).toBe(6)
    await expect(page.locator('button[aria-pressed="true"]')).toHaveCount(0)

    await page.getByRole("button", { name: "Saltar", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Ahora sí, los planes." })).toBeVisible({ timeout: 30000 })

    // Y al volver sigue sin respuesta: saltar no inventó una.
    await page.goto("/onboarding")
    await expect(page.locator("#contenido")).toBeVisible({ timeout: 60000 })
    const cuerpo = await page.request.get("/api/onboarding").then((r) => r.json())
    expect(cuerpo?.onboarding?.onboardingProgress?.acquisitionSource ?? null).toBeNull()
  })

  /**
   * Escribir mientras guarda, y avanzar mientras guarda.
   *
   * Los dos casos perdían trabajo: la versión del borrador salía de un cierre de
   * React, así que una segunda escritura en pleno vuelo mandaba una versión ya
   * vieja, el servidor la rechazaba por conflicto y la pantalla recargaba encima
   * de lo que la persona acababa de teclear. Avanzar en vuelo fallaba igual.
   */
  test("escribir y avanzar mientras guarda no pierde nada", async ({ page }) => {
    await page.getByRole("button", { name: "Saltar introducción" }).click()
    await expect(page.getByRole("heading", { name: "Tu negocio" })).toBeVisible()

    const nombre = `Café Aurora ${Date.now()}`
    await page.getByLabel("Nombre del negocio").fill(nombre)
    // Sin esperar el "Guardado": se elige la categoría con el guardado en curso.
    await page.locator("fieldset button").first().click()
    // Y se avanza de inmediato, todavía guardando.
    await page.getByRole("button", { name: "Continuar" }).click()

    // El paso avanza y no aparece ningún conflicto.
    await expect(page.getByRole("heading", { name: "Tu primera tarjeta" })).toBeVisible({ timeout: 30000 })
    await expect(page.getByText(/recargamos lo último guardado/i)).toHaveCount(0)

    // Y lo escrito llegó al servidor: se comprueba contra la API, no en pantalla.
    const cuerpo = await (await page.request.get("/api/onboarding")).json()
    const borrador = cuerpo?.onboarding?.onboardingProgress?.businessDraft ?? {}
    expect(borrador.name, "el nombre se perdió en el vuelo").toBe(nombre)
    expect(borrador.categoryId, "la categoría se perdió en el vuelo").toBeTruthy()
  })
})
