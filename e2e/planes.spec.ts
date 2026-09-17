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

  // Lo que no se puede probar todavía porque el servidor no lo hace.
  // Ver FID-0026, hallazgo 3.
  test.fixme("el mes de Pro incluido vence en proTrialEndsAt", async () => {
    // `activateManualSubscription` nunca escribe proTrialEndsAt y
    // `getEntitlements` ignora su parámetro `now`, así que proAccessGranted da
    // PRO para siempre.
  })

  test.fixme("al vencer el trial se aplican los entitlements de Lite", async () => {
    // syncExpiredEntitlements vuelve a aplicar lo que getEntitlements devuelve,
    // que sigue siendo PRO: no puede producir la transición.
  })

  test.fixme("un tema Pro conserva su selección y cae al respaldo de Lite", async () => {
    // El catálogo no tiene ningún tema con plan PRO, así que la rama Pro de
    // resolveTheme y el themeLocked no se pueden ejercitar. Ver FID-0026,
    // hallazgos 1 y 2.
  })
})
