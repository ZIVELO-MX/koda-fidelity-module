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
