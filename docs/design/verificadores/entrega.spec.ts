import { test, expect } from "@playwright/test"
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"

const documentos = [
  { nombre: "wireframe", ruta: "docs/design/wireframe-rediseno.html" },
  { nombre: "prototipo", ruta: "docs/design/prototipo-alta.html" },
]

for (const doc of documentos) {
  test(`${doc.nombre} no desborda horizontalmente`, async ({ page }, info) => {
    await page.goto(pathToFileURL(resolve(doc.ruta)).href)
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )
    expect(desborda, `${doc.nombre} desborda en ${info.project.name}`).toBe(false)
    await page.screenshot({
      path: `docs/design/verificadores/capturas/${doc.nombre}-${info.project.name}.png`,
      fullPage: true,
    })
  })

  test(`${doc.nombre} no contiene em dash`, async ({ page }) => {
    await page.goto(pathToFileURL(resolve(doc.ruta)).href)
    const texto = await page.evaluate(() => document.body.innerText)
    expect(texto).not.toContain("—")
    expect(texto).not.toContain("–")
  })
}

test("el prototipo recorre el alta completa", async ({ page }, info) => {
  await page.goto(pathToFileURL(resolve("docs/design/prototipo-alta.html")).href)
  for (const paso of ["datos", "tarjeta", "club", "atribucion", "paywall"]) {
    await page.getByTestId(`continuar-${paso}`).click()
    await expect(page.getByTestId(`pantalla-${paso}`)).toBeVisible()
    await page.screenshot({
      path: `docs/design/verificadores/capturas/alta-${paso}-${info.project.name}.png`,
      fullPage: true,
    })
  }
  await page.getByTestId("salir-paywall").click()
  await expect(page.getByTestId("pantalla-regreso")).toBeVisible()
  await page.screenshot({
    path: `docs/design/verificadores/capturas/alta-regreso-${info.project.name}.png`,
    fullPage: true,
  })
})

test("todo destino de navegación llega a 44px de alto", async ({ page }) => {
  await page.goto(pathToFileURL(resolve("docs/design/prototipo-alta.html")).href)
  const botones = await page.getByRole("button").all()
  expect(botones.length).toBeGreaterThan(0)
  for (const boton of botones) {
    if (!(await boton.isVisible())) continue
    const caja = await boton.boundingBox()
    if (caja) expect(caja.height, await boton.innerText()).toBeGreaterThanOrEqual(44)
  }
})

test("el conmutador de facturación cambia los precios", async ({ page }) => {
  await page.goto(pathToFileURL(resolve("docs/design/prototipo-alta.html")).href)
  for (const paso of ["datos", "tarjeta", "club", "atribucion", "paywall"]) {
    await page.getByTestId(`continuar-${paso}`).click()
  }
  await expect(page.locator('[data-precio="lite"]')).toHaveText("$1,490")
  await page.getByTestId("mensual").click()
  await expect(page.locator('[data-precio="lite"]')).toHaveText("$149")
  await expect(page.locator('[data-precio="pro"]')).toHaveText("$299")
  await expect(page.getByTestId("mensual")).toHaveAttribute("aria-pressed", "true")
  await page.getByTestId("anual").click()
  await expect(page.locator('[data-precio="lite"]')).toHaveText("$1,490")
  await expect(page.getByTestId("anual")).toHaveAttribute("aria-pressed", "true")
})

test("los selectores cambian la categoría y la piel de la tarjeta", async ({ page }) => {
  await page.goto(pathToFileURL(resolve("docs/design/prototipo-alta.html")).href)
  await page.getByTestId("continuar-datos").click()
  await expect(page.getByTestId("categoria").locator("option")).toHaveCount(13)
  await page.getByTestId("continuar-tarjeta").click()
  await expect(page.locator("#temas .tema")).toHaveCount(5)
  await expect(page.getByTestId("tema-lite")).toHaveAttribute("aria-pressed", "true")
  await page.getByTestId("tema-foil").click()
  await expect(page.getByTestId("tema-foil")).toHaveAttribute("aria-pressed", "true")
  // El foil es negro en toda categoría, así que se vuelve a Lite para comparar acentos.
  await page.getByTestId("tema-lite").click()

  const tarjeta = page.locator("[data-tarjeta]").first()
  const cafeteria = await tarjeta.evaluate((el) => getComputedStyle(el).backgroundColor)

  await page.getByTestId("continuar-club").click()
  await page.getByTestId("continuar-atribucion").click()
  await page.getByTestId("continuar-paywall").click()
  await page.getByTestId("salir-paywall").click()
  await page.getByTestId("reiniciar").click()
  await page.getByTestId("continuar-datos").click()
  await page.getByTestId("categoria").selectOption({ label: "Heladería" })
  const heladeria = await tarjeta.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(heladeria).not.toBe(cafeteria)
  expect(heladeria).toBe("rgb(219, 39, 119)")
})
