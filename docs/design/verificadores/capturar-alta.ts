/**
 * Capturas del alta, pantalla por pantalla.
 *
 * Corre sobre el **mock del alta**, no sobre la base: `lib/onboarding-mock.ts`
 * guarda el estado en memoria del proceso, así que el recorrido no escribe una
 * sola fila en la base compartida. Antes de retratar nada, el script comprueba
 * que el aviso «Onboarding de prueba» esté en pantalla; si no está, se planta.
 *
 * No es un spec de Playwright a propósito: `playwright.config.ts` levanta
 * `next start`, y en producción el mock está desactivado, así que un spec se
 * saltaría siempre.
 *
 *   FID_DEBUG_AUTH=true \
 *   FID_ONBOARDING_MOCK_EMAIL=cuenta@de-pruebas \
 *   pnpm dev
 *
 *   E2E_ONBOARDING_EMAIL=cuenta@de-pruebas E2E_ONBOARDING_PASSWORD=... \
 *   pnpm exec tsx docs/design/verificadores/capturar-alta.ts 1440 escritorio
 *
 * El estado vive mientras el proceso esté encendido, así que **cada ancho
 * necesita un servidor recién arrancado**. Si no, el alta empieza donde la dejó
 * la corrida anterior y las capturas salen del paso equivocado.
 */
import { chromium, type Page } from "@playwright/test"

const BASE = process.env.BASE_URL ?? "http://localhost:3000"
const CORREO = process.env.E2E_ONBOARDING_EMAIL
const CLAVE = process.env.E2E_ONBOARDING_PASSWORD ?? process.env.E2E_PORTAL_PASSWORD
const SALIDA = "docs/design/verificadores/capturas"
const ancho = Number(process.argv[2] ?? 1440)
const etiqueta = process.argv[3] ?? "escritorio"

async function paso(page: Page) {
  const respuesta = await page.request.get(`${BASE}/api/onboarding`)
  const cuerpo = await respuesta.json()
  return cuerpo.onboarding?.onboardingProgress?.step
}

async function main() {
  if (!CORREO || !CLAVE) throw new Error("Faltan E2E_ONBOARDING_EMAIL y su clave")

  const navegador = await chromium.launch()
  const page = await navegador.newPage({ viewport: { width: ancho, height: ancho < 500 ? 800 : 1000 } })
  const retratar = async (nombre: string) => {
    await page.screenshot({ path: `${SALIDA}/alta-${nombre}-${etiqueta}.png`, fullPage: true })
    console.log(`${SALIDA}/alta-${nombre}-${etiqueta}.png`)
  }

  try {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" })
    await page.getByLabel("Correo electrónico").fill(CORREO)
    await page.getByRole("button", { name: "Continuar", exact: true }).click()
    await page.locator('input[name="password"]').fill(CLAVE)
    await page.getByRole("button", { name: "Iniciar sesión" }).click()
    await page.waitForURL("**/dashboard**", { timeout: 30000 })

    await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" })
    // La salvaguarda: sin mock, esto escribiría en la base compartida.
    if (!(await page.getByText("Onboarding de prueba").isVisible())) {
      throw new Error("El alta no está en modo mock. Levanta el servidor con FID_ONBOARDING_MOCK_EMAIL.")
    }
    if ((await paso(page)) !== "INTRO") {
      throw new Error("El alta no empieza en INTRO: reinicia el servidor, el mock conserva el estado anterior.")
    }

    for (const lamina of [1, 2, 3]) {
      await retratar(`1-intro-${lamina}`)
      await page.getByRole("button", { name: /^(Siguiente|Empezar)$/ }).first().click()
      await page.waitForTimeout(700)
    }

    await page.locator("input:visible").first().fill("Café Aurora")
    await page.getByRole("button", { name: "Café", exact: true }).click()
    await retratar("2-negocio")
    await page.getByRole("button", { name: /^Continuar$/ }).first().click()
    await page.waitForTimeout(1600)

    await page.locator("input:visible").first().fill("Décimo café gratis")
    await page.getByRole("button", { name: "10", exact: true }).first().click()
    await page.getByRole("button", { name: "Cafetería", exact: true }).first().click()
    await retratar("3-tarjeta")
    await page.getByRole("button", { name: /^Continuar$/ }).first().click()
    await page.waitForTimeout(2200)

    // El momento de llegada del wireframe: «Club» más el nombre del negocio.
    await retratar("4-club")
    await page.getByRole("button", { name: /^Continuar$/ }).first().click()
    await page.waitForTimeout(1300)

    await retratar("5-origen")
    // El indicador de desarrollo de Next se planta en la esquina y puede tapar
    // «Saltar» en móvil. Es del servidor de desarrollo, no del producto.
    await page.getByRole("button", { name: /^Saltar$/ }).first().click({ force: true })
    await page.waitForTimeout(2200)
    await retratar("6-muro")
    console.log("paso final:", await paso(page))
  } finally {
    await navegador.close()
  }
}

void main()
