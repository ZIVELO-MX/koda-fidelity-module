import { test, expect, type Page } from "@playwright/test"

// Recorrido de la ola 4: landing pública y alta por QR.
//
// Se escribe antes que la implementación, como en la ola 3. No necesita sesión:
// las dos superficies son públicas.

const ANCHOS = [
  { nombre: "movil", width: 375, height: 812 },
  { nombre: "tableta", width: 768, height: 1024 },
  { nombre: "escritorio", width: 1440, height: 900 },
]

// Lo que el producto no ofrece, no se promete. Sale de la decisión de precios
// confirmados: no hay prueba gratuita ni cobro sin tarjeta.
// La misma intención, el alta de un negocio, se llama igual en toda la página.
const ETIQUETA = "Empieza por solo $149 al mes"

const PROMESAS_SIN_RESPALDO = [
  /14 d[ií]as/i,
  /catorce d[ií]as/i,
  /prueba gratuita/i,
  /sin tarjeta de cr[eé]dito/i,
  /pr[oó]ximamente/i,
  /por definir/i,
  // Empezar no es gratis: publicar la tarjeta requiere contratar un plan.
  /empezar gratis/i,
  // El producto no tiene cientos de negocios: está antes de su lanzamiento.
  /cientos de/i,
]

async function desborda(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
}

test.describe("ola 4, landing pública", () => {
  for (const ancho of ANCHOS) {
    test.describe(`${ancho.nombre} (${ancho.width}px)`, () => {
      test.use({ viewport: { width: ancho.width, height: ancho.height } })

      test("no desborda y respeta el área táctil", async ({ page }) => {
        await page.goto("/")
        expect(await desborda(page), `la landing desborda en ${ancho.nombre}`).toBe(false)

        for (const { rol, minimo } of [
          { rol: "button" as const, minimo: 40 },
          { rol: "link" as const, minimo: 44 },
        ]) {
          for (const objetivo of await page.getByRole(rol).all()) {
            if (!(await objetivo.isVisible())) continue
            const nombre =
              (await objetivo.getAttribute("aria-label")) || (await objetivo.innerText()).trim()
            if (/next\.js/i.test(nombre)) continue
            const caja = await objetivo.boundingBox()
            if (caja) {
              expect(
                caja.height,
                `${rol} "${nombre}" en ${ancho.nombre}`,
              ).toBeGreaterThanOrEqual(minimo)
            }
          }
        }
      })

      test("el alta pública cabe y explica un enlace roto", async ({ page }) => {
        await page.goto("/join/esta-tarjeta-no-existe")
        await expect(
          page.getByRole("heading", { name: "Este enlace no lleva a ninguna tarjeta" }),
        ).toBeVisible({ timeout: 30000 })
        expect(await desborda(page), `el alta desborda en ${ancho.nombre}`).toBe(false)

        for (const { rol, minimo } of [
          { rol: "button" as const, minimo: 40 },
          { rol: "link" as const, minimo: 44 },
        ]) {
          for (const objetivo of await page.getByRole(rol).all()) {
            if (!(await objetivo.isVisible())) continue
            const nombre =
              (await objetivo.getAttribute("aria-label")) || (await objetivo.innerText()).trim()
            if (/next\.js/i.test(nombre)) continue
            const caja = await objetivo.boundingBox()
            if (caja) {
              expect(caja.height, `${rol} "${nombre}" en ${ancho.nombre}`).toBeGreaterThanOrEqual(
                minimo,
              )
            }
          }
        }
      })

      test("el hero cabe en el primer viewport, con su botón a la vista", async ({ page }) => {
        await page.goto("/")
        const principal = page.getByRole("link", { name: ETIQUETA }).first()
        await expect(principal).toBeVisible()
        const caja = await principal.boundingBox()
        expect(caja, "el botón principal del hero no tiene caja").not.toBeNull()
        expect(
          caja!.y + caja!.height,
          `el botón del hero cae fuera del primer viewport en ${ancho.nombre}`,
        ).toBeLessThanOrEqual(ancho.height)
      })
    })
  }

  test.describe("lo que dice la página", () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test("publica los precios confirmados", async ({ page }) => {
      await page.goto("/")
      const precios = page.locator("#pricing")
      await expect(precios).toContainText("149")
      await expect(precios).toContainText("299")
      await expect(precios).toContainText("1,490")
      await expect(precios).toContainText("2,990")
    })

    test("no promete lo que el producto no ofrece", async ({ page }) => {
      await page.goto("/")
      const texto = await page.locator("body").innerText()
      for (const promesa of PROMESAS_SIN_RESPALDO) {
        expect(texto, `la landing promete ${promesa}`).not.toMatch(promesa)
      }
    })

    test("cero em dash en el texto visible", async ({ page }) => {
      await page.goto("/")
      const texto = await page.locator("body").innerText()
      expect(texto).not.toContain("—")
      expect(texto).not.toContain("–")
    })

    test("una sola etiqueta por intención", async ({ page }) => {
      await page.goto("/")
      // Empezar el alta de un negocio es una intención. Todos los destinos a
      // /signup tienen que llamarla igual.
      const etiquetas = new Set<string>()
      for (const enlace of await page.locator('a[href="/signup"]').all()) {
        if (await enlace.isVisible()) etiquetas.add((await enlace.innerText()).trim())
      }
      expect(
        [...etiquetas],
        "el alta de negocio se llama de más de una forma",
      ).toHaveLength(1)
    })

    test("un enlace de alta inválido dice qué pasó, no que no existe la tarjeta", async ({ page }) => {
      await page.goto("/join/esta-tarjeta-no-existe")
      await expect(
        page.getByRole("heading", { name: "Este enlace no lleva a ninguna tarjeta" }),
      ).toBeVisible({ timeout: 30000 })
      // La regresión: los tres motivos salían bajo "Tarjeta no encontrada".
      await expect(page.locator("body").getByText("Tarjeta no encontrada")).toHaveCount(0)
      await expect(page.getByRole("link", { name: "Ir al inicio" })).toBeVisible()
    })

    test("las preguntas abren sin JavaScript y la primera ya está abierta", async ({ page }) => {
      await page.goto("/")
      const preguntas = page.locator("#faq details")
      await expect(preguntas.first()).toHaveAttribute("open", "")
      // Acordeón nativo: si alguien lo cambia por una librería, esto avisa.
      expect(await preguntas.count()).toBeGreaterThan(3)
    })

    test("cada campo del formulario lleva su etiqueta a la vista", async ({ page }) => {
      await page.goto("/")
      // Los seis campos del diseño aprobado, con sus ids, que no se cambian
      // porque romperían analítica y autocompletado.
      for (const id of ["nombre", "negocio", "giro", "sucursales", "contacto", "plan"]) {
        const campo = page.locator(`#lp-form-${id}`)
        await expect(campo, `falta el campo ${id}`).toBeVisible()
        const etiqueta = page.locator(`label[for="lp-form-${id}"]`)
        // getByLabel no basta: hay que ver la etiqueta, no solo asociarla.
        await expect(etiqueta, `${id} no tiene etiqueta a la vista`).toBeVisible()
      }
    })

    test("el contacto se valida al salir del campo", async ({ page }) => {
      await page.goto("/")
      const contacto = page.locator("#lp-form-contacto")
      await contacto.fill("esto no es un contacto")
      await contacto.blur()
      await expect(contacto).toHaveAttribute("aria-invalid", "true")
      await expect(page.getByText("Ingresa un correo o teléfono válido")).toBeVisible()

      await contacto.fill("5512345678")
      await contacto.blur()
      await expect(contacto).toHaveAttribute("aria-invalid", "false")
    })

    test("los pasos no se numeran, el verbo ya los nombra", async ({ page }) => {
      await page.goto("/")
      const comoFunciona = page.locator("#how-it-works")
      await expect(comoFunciona).not.toContainText("01")
      await expect(comoFunciona).not.toContainText("02")
      await expect(comoFunciona).not.toContainText("03")
    })
  })
})
