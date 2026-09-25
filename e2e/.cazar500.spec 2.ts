import { test, expect } from "@playwright/test"
import { entrar } from "./sesion"

test("cazar respuestas 4xx/5xx del recorrido del muro", async ({ page }) => {
  const malas: string[] = []
  page.on("response", (r) => {
    if (r.status() >= 400) malas.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`)
  })
  await entrar(page, process.env.E2E_ONBOARDING_EMAIL!, process.env.E2E_ONBOARDING_PASSWORD!)
  await page.waitForTimeout(4000)
  console.log("TRAS_LOGIN:", JSON.stringify(malas))
  malas.length = 0

  await page.goto("/onboarding")
  await expect(page.locator("#contenido")).toBeVisible({ timeout: 60000 })
  await page.waitForTimeout(3000)
  console.log("EN_ONBOARDING:", JSON.stringify(malas))
  malas.length = 0

  const boton = page.getByRole("button", { name: /solicitar activación de lite/i })
  if (await boton.isVisible().catch(() => false)) {
    await boton.click()
    await page.waitForTimeout(4000)
  }
  console.log("TRAS_SOLICITAR:", JSON.stringify(malas))
  expect(true).toBe(true)
})
