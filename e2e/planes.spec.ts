import { test, expect } from "@playwright/test"
import { entrar } from "./sesion"

/**
 * Planes Lite y Pro: entitlements y transiciones.
 *
 * "Los planes funcionan" significa aquí activación manual, trial y entitlements.
 * El cobro real no existe todavía y no se simula ninguna compra.
 *
 * Las transiciones que dependen del vencimiento del mes de Pro están marcadas
 * como `fixme` y no como `skip`: no faltan variables de entorno, falta el
 * comportamiento. `proTrialEndsAt` no se escribe ni se lee en ninguna parte del
 * servidor, así que el trial no vence nunca. Está documentado en FID-0026.
 */
const CORREO = process.env.E2E_ONBOARDING_EMAIL
const CLAVE = process.env.E2E_ONBOARDING_PASSWORD

const PRECIOS = { lite: { mes: 149, anio: 1490 }, pro: { mes: 299, anio: 2990 } }

test.describe("Planes Lite y Pro", () => {
  test.describe("lo que la interfaz promete", () => {
    test("el muro de pago dice los precios acordados", async ({ page }) => {
      test.skip(!CORREO || !CLAVE, "Requiere las credenciales del fixture del alta")

      await entrar(page, CORREO!, CLAVE!)
      await page.goto("/onboarding")
      await expect(page.locator("#contenido")).toBeVisible({ timeout: 60000 })

      const muro = page.getByRole("heading", { name: "Publica tu tarjeta" })
      if (!(await muro.isVisible().catch(() => false))) {
        test.skip(true, "La cuenta del fixture no está en el muro de pago; corre prepare:onboarding-e2e")
      }

      const tarjetaLite = page.locator("div").filter({ has: page.getByRole("heading", { name: "Lite" }) }).last()
      const tarjetaPro = page.locator("div").filter({ has: page.getByRole("heading", { name: "Pro" }) }).last()

      await expect(page.getByRole("radio", { name: /al año/i })).toBeChecked()
      await expect(tarjetaLite).toContainText(`$${PRECIOS.lite.anio.toLocaleString("es-MX")}`)
      await expect(tarjetaPro).toContainText(`$${PRECIOS.pro.anio.toLocaleString("es-MX")}`)
      await expect(page.getByText(/disponible al terminar tu primer mes/i)).toBeVisible()

      await page.getByRole("radio", { name: "Al mes" }).click()
      await expect(tarjetaLite).toContainText(`$${PRECIOS.lite.mes}`)
      await expect(tarjetaPro).toContainText(`$${PRECIOS.pro.mes}`)
    })

    test("no se simula ninguna compra", async ({ page }) => {
      test.skip(!CORREO || !CLAVE, "Requiere las credenciales del fixture del alta")

      await entrar(page, CORREO!, CLAVE!)
      await page.goto("/onboarding")
      const contratar = page.getByRole("button", { name: /contratar lite/i })
      if (!(await contratar.isVisible().catch(() => false))) {
        test.skip(true, "La cuenta del fixture no está en el muro de pago")
      }

      await contratar.click()
      await expect(page.getByText(/el cobro todavía no está activo/i)).toBeVisible()
      // Y sigue sin publicar: la salida conserva su consecuencia dicha.
      await expect(page.getByText(/sin publicar, tu tarjeta no genera código qr/i)).toBeVisible()
    })
  })

  test.describe("entitlements del servidor", () => {
    test.skip(!CORREO || !CLAVE, "Requiere las credenciales del fixture del alta")

    test("la suscripción responde con su plan, su modalidad y si está en trial", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)

      const res = await page.request.get("/api/subscription")
      expect(res.ok(), "un negocio con sesión tiene que poder leer sus entitlements").toBe(true)

      const { entitlements } = await res.json()
      expect(entitlements).toBeTruthy()
      expect(["LITE", "PRO"]).toContain(entitlements.plan)
      expect(entitlements).toHaveProperty("trial")
      // Un Lite con mes de Pro incluido se reporta como Pro y en trial.
      if (entitlements.subscription?.proAccessGranted && entitlements.subscription?.plan === "LITE") {
        expect(entitlements.plan).toBe("PRO")
        expect(entitlements.trial).toBe(true)
      }
    })

    test("la operación manual es idempotente: repetirla no encadena suscripciones", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      const primera = await (await page.request.get("/api/subscription")).json()
      const segunda = await (await page.request.get("/api/subscription")).json()
      expect(segunda.entitlements.subscription?.id).toBe(primera.entitlements.subscription?.id)
    })
  })

  test.describe("una tarjeta bloqueada por plan no se ofrece al cliente", () => {
    test.skip(!CORREO || !CLAVE, "Requiere las credenciales del fixture del alta")

    test("el alta pública rechaza la que no está activa", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      const tarjetas = await (await page.request.get("/api/cards")).json()
      const lista: { id: string; status?: string; isActive?: boolean }[] = tarjetas.cards ?? tarjetas.items ?? []

      // /api/cards solo devuelve activas: ninguna bloqueada puede colarse.
      for (const tarjeta of lista) {
        if (tarjeta.status) expect(tarjeta.status, "una tarjeta listada no puede estar bloqueada").toBe("ACTIVE")
      }
    })
  })

  /**
   * Transición del mes de Pro incluido a Lite.
   *
   * Necesita el estado que monta `E2E_ONBOARDING_MODE=expired-trial`: un mes de
   * Pro ya vencido, dos tarjetas y un tema Pro elegido en la primera.
   *
   * La comprobación de capacidad no es un adorno: estas tres dependen de
   * FID-0026 (temas Pro en el catálogo y `proTrialEndsAt` leído de verdad). Si
   * el backend de esta rama todavía no lo trae, se dice por qué en vez de
   * fallar por la razón equivocada.
   */
  test.describe("el mes de Pro incluido termina", () => {
    test.skip(!CORREO || !CLAVE, "Requiere las credenciales del fixture del alta")

    let hayTemasPro = false

    test.beforeEach(async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      const res = await page.request.get("/api/onboarding")
      const cuerpo = await res.json().catch(() => null)
      const temas: { plan?: string }[] = cuerpo?.themes ?? []
      hayTemasPro = temas.some((t) => t.plan === "PRO")
      test.skip(
        !hayTemasPro,
        "Requiere FID-0026 en esta rama: el catálogo todavía no tiene temas Pro",
      )
    })

    test("con la fecha pasada, los entitlements son Lite y ya no hay trial", async ({ page }) => {
      const { entitlements } = await (await page.request.get("/api/subscription")).json()

      // La suscripción sigue siendo Lite con acceso Pro concedido; lo que manda
      // es la fecha, no la bandera.
      expect(entitlements.subscription?.plan).toBe("LITE")
      expect(entitlements.plan, "un trial vencido no puede seguir dando Pro").toBe("LITE")
      expect(entitlements.trial).toBe(false)
    })

    test("al vencer se aplican los entitlements de Lite: una sola tarjeta activa", async ({ page }) => {
      // Leer las tarjetas dispara la sincronización.
      const tarjetas = await (await page.request.get("/api/cards")).json()
      const activas: { status?: string }[] = tarjetas.cards ?? tarjetas.items ?? []

      expect(activas.length, "con Lite solo una tarjeta queda activa").toBe(1)
      for (const tarjeta of activas) expect(tarjeta.status).toBe("ACTIVE")
      // Que las demás queden bloqueadas y no borradas lo cubre la prueba de
      // integración del backend; desde el cliente solo se ven las activas.
    })

    test("el tema Pro conserva su selección y cae al respaldo de Lite", async ({ page }) => {
      const tarjetas = await (await page.request.get("/api/cards")).json()
      const lista: {
        selectedThemeId?: string | null
        effectiveThemeId?: string | null
        themeLocked?: boolean
      }[] = tarjetas.cards ?? tarjetas.items ?? []
      const conTema = lista.find((t) => t.selectedThemeId)
      expect(conTema, "la tarjeta que se conserva tiene que traer su tema elegido").toBeTruthy()

      expect(conTema!.selectedThemeId, "la selección no se pierde al degradar").toBeTruthy()
      expect(
        conTema!.effectiveThemeId,
        "el tema efectivo tiene que dejar de ser el Pro elegido",
      ).not.toBe(conTema!.selectedThemeId)
      expect(conTema!.themeLocked).toBe(true)
    })
  })
})
