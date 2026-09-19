import { test, expect } from "@playwright/test"
import { entrar } from "./sesion"

/**
 * El alta guiada contra `/api/onboarding`.
 *
 * La primera versión de esta pantalla guardaba el borrador en `localStorage`;
 * ahora el dueño del paso, del estado y del borrador es `OnboardingProgress`.
 * Lo que se prueba aquí es justo eso: que lo escrito sobrevive en el servidor y
 * que la interfaz no inventa su propio flujo.
 *
 * No se llega a crear la primera tarjeta: `complete_card` crea una tarjeta de
 * verdad, y estas pruebas corren contra la base compartida. El recorrido
 * completo, con `onboarding:debug reset` como fixture, corre en CI.
 */
const CORREO = process.env.E2E_EMAIL
const CLAVE = process.env.E2E_PASSWORD

test.describe("Alta guiada", () => {
  test("sin sesión no se llega: manda al acceso", async ({ page }) => {
    await page.goto("/onboarding")
    await page.waitForURL("**/login", { timeout: 60000 })
  })

  test.describe("con sesión", () => {
    test.skip(!CORREO || !CLAVE, "Requiere E2E_EMAIL y E2E_PASSWORD de una cuenta admin de prueba")

    test("el estado lo sirve el servidor, no el navegador", async ({ page }) => {
      const llamadas: string[] = []
      page.on("request", (r) => {
        if (r.url().includes("/api/onboarding")) llamadas.push(r.method())
      })

      await entrar(page, CORREO!, CLAVE!)
      await page.goto("/onboarding")
      await expect(page.locator("#contenido")).toBeVisible({ timeout: 60000 })

      expect(llamadas, "la pantalla tiene que leer /api/onboarding al abrirse").toContain("GET")

      // El borrador ya no vive en el navegador.
      const guardado = await page.evaluate(() => window.localStorage.getItem("koda-fidelity:alta"))
      expect(guardado).toBeNull()
    })

    test("las categorías vienen del backend, con su identificador", async ({ page }) => {
      const respuesta = page.waitForResponse((r) => r.url().includes("/api/onboarding") && r.request().method() === "GET")

      await entrar(page, CORREO!, CLAVE!)
      await page.goto("/onboarding")
      const cuerpo = await (await respuesta).json()

      const categorias: { id: string; name: string }[] = cuerpo.categories ?? []
      expect(categorias.length, "el backend tiene que servir el catálogo de categorías").toBeGreaterThan(0)
      for (const categoria of categorias) {
        expect(categoria.id, "cada categoría necesita identificador").toBeTruthy()
      }

      // Si la pantalla está en el paso de datos, las que pinta son esas y no otras.
      const enDatos = await page.getByRole("heading", { name: "Tu negocio" }).isVisible().catch(() => false)
      if (enDatos) {
        for (const categoria of categorias.slice(0, 3)) {
          await expect(page.getByRole("button", { name: categoria.name, exact: true })).toBeVisible()
        }
      }
    })

    test("lo escrito se guarda en el servidor y sobrevive a recargar", async ({ page }) => {
      await entrar(page, CORREO!, CLAVE!)
      await page.goto("/onboarding")
      await expect(page.locator("#contenido")).toBeVisible({ timeout: 60000 })

      // Llegar al paso de datos, saltando la intro si toca.
      const saltar = page.getByRole("button", { name: "Saltar la introducción" })
      if (await saltar.isVisible().catch(() => false)) await saltar.click()

      const campo = page.getByLabel("Nombre del negocio")
      if (!(await campo.isVisible().catch(() => false))) {
        test.skip(true, "La cuenta de pruebas ya pasó del paso de datos")
      }

      const nombre = `Café Aurora ${Date.now()}`
      const guardado = page.waitForResponse(
        (r) => r.url().includes("/api/onboarding") && r.request().method() === "PATCH" && r.ok(),
      )
      await campo.fill(nombre)
      await guardado

      await page.reload()
      await expect(page.getByLabel("Nombre del negocio")).toHaveValue(nombre, { timeout: 60000 })
    })

    test("una cuenta activa no vuelve al alta por accidente", async ({ page }) => {
      const respuesta = page.waitForResponse((r) => r.url().includes("/api/onboarding") && r.request().method() === "GET")

      await entrar(page, CORREO!, CLAVE!)
      await page.goto("/onboarding")
      const cuerpo = await (await respuesta).json()

      if (cuerpo?.onboarding?.onboardingProgress?.status === "ACTIVE") {
        await expect(page.getByRole("heading", { name: "Tu alta ya está terminada" })).toBeVisible()
        await expect(page.getByRole("link", { name: "Ir a tu panel" })).toBeVisible()
      } else {
        // Si no está activa, la pantalla tiene que estar en un paso real.
        await expect(page.locator("#contenido")).toBeVisible()
      }
    })
  })
})
