import { expect, type Page } from "@playwright/test"

/**
 * Entrar al panel con la cuenta de pruebas.
 *
 * Vivía copiado en cuatro specs. Además, cuando el primer paso no llevaba ni al
 * campo de contraseña ni al aviso de correo enviado, la espera agotaba sus 60s
 * y el fallo salía como "element(s) not found", sin decir por qué. Pasa de
 * verdad: si Supabase devuelve `over_email_send_rate_limit`, la pantalla enseña
 * el error y ninguno de los dos destinos aparece. Con 26 pruebas por delante eso
 * son ocho minutos de espera para un diagnóstico equivocado.
 */
export async function entrar(page: Page, correo: string, clave: string) {
  await page.goto("/login")
  await page.getByLabel("Correo electrónico").fill(correo)
  await page.getByRole("button", { name: "Continuar", exact: true }).click()

  // Por id: el botón de mostrar u ocultar lleva "contraseña" en su aria-label y
  // haría ambigua una búsqueda por etiqueta.
  const contraseña = page.locator("#password")
  const enlaceEnviado = page.getByText("Revisa tu correo")
  // Por clase, no por rol: el aviso de error del login no lleva `role="alert"`.
  // Esa pantalla pertenece a FID-0013 y esta ola no la toca, así que la falta
  // queda documentada en esa misión y aquí se localiza como se pueda.
  const fallo = page.locator("[class*='bg-destructive/10']").first()

  // La espera es amplia a propósito: en desarrollo la ruta se compila al primer
  // pedido.
  await expect(
    contraseña.or(enlaceEnviado).or(fallo).first(),
    "el primer paso del login no llevó a ningún sitio",
  ).toBeVisible({ timeout: 60000 })

  if (await fallo.isVisible()) {
    throw new Error(`El login rechazó a ${correo}: ${(await fallo.innerText()).trim()}`)
  }

  if (await enlaceEnviado.isVisible()) {
    throw new Error(
      `E2E_EMAIL (${correo}) no es la cuenta de un negocio en esta base de datos: la app lo ` +
        "tomó como cliente y le mandó un enlace mágico por correo. Usa la cuenta de un negocio " +
        "con rol admin antes de volver a correr esto.",
    )
  }

  await contraseña.fill(clave)
  await page.getByRole("button", { name: "Iniciar Sesión" }).click()
  await page.waitForURL("**/dashboard", { timeout: 60000 })
}
