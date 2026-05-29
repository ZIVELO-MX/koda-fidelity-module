import { test, expect } from "@playwright/test"

test.describe("Auth Error Handling", () => {
  test("auth/error page shows expired error for otp_expired code", async ({ page }) => {
    await page.goto("/auth/error?error_code=otp_expired")
    await expect(page.getByText("Enlace Expirado")).toBeVisible()
    await expect(page.getByText("ya no es válido")).toBeVisible()
  })

  test("auth/error page shows rate limit error for rate_limit code", async ({ page }) => {
    await page.goto("/auth/error?error_code=rate_limit")
    await expect(page.getByText("Demasiados Intentos")).toBeVisible()
    await expect(page.getByText("demasiados enlaces")).toBeVisible()
  })

  test("auth/error page shows generic error for unknown error_code", async ({ page }) => {
    await page.goto("/auth/error?error_code=unknown_error")
    await expect(page.getByText("Error de Autenticación")).toBeVisible()
  })

  test("auth/error page shows friendly message for expired error message", async ({ page }) => {
    await page.goto("/auth/error?error=Email%20link%20is%20invalid%20or%20has%20expired")
    await expect(page.getByText("Enlace Expirado")).toBeVisible()
  })

  test("auth/error page shows friendly message for invalid token", async ({ page }) => {
    await page.goto("/auth/error?error=Invalid%20token")
    await expect(page.getByText("Enlace No Válido")).toBeVisible()
  })

  test("auth/error page shows error_description when provided", async ({ page }) => {
    await page.goto("/auth/error?error_description=Custom%20error%20detail&error=something")
    await expect(page.getByText("Custom error detail")).toBeVisible()
  })

  test("auth/error page has resend form", async ({ page }) => {
    await page.goto("/auth/error?error_code=otp_expired")
    await expect(page.getByLabel("Tu correo electrónico")).toBeVisible()
    await expect(page.getByRole("button", { name: "Reenviar enlace mágico" })).toBeVisible()
  })

  test("auth/error page validates resend email", async ({ page }) => {
    await page.goto("/auth/error?error_code=otp_expired")
    await page.getByRole("button", { name: "Reenviar enlace mágico" }).click()
    await expect(page.getByText("Ingresa un correo electrónico válido")).toBeVisible()
  })

  test("auth/confirm redirects to error when missing params", async ({ page }) => {
    await page.goto("/auth/confirm")
    await page.waitForURL("**/auth/error?error_code=missing_params")
    await expect(page.getByText("Error de Autenticación")).toBeVisible()
  })

  test("auth/confirm redirects to error when only token_hash is present", async ({ page }) => {
    await page.goto("/auth/confirm?token_hash=somehash")
    await page.waitForURL("**/auth/error?error_code=missing_params")
  })

  test("auth/confirm redirects to error when only type is present", async ({ page }) => {
    await page.goto("/auth/confirm?type=magiclink")
    await page.waitForURL("**/auth/error?error_code=missing_params")
  })
})
