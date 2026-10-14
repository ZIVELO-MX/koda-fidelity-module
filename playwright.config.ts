import { defineConfig } from "@playwright/test"

// Next lee `.env` por su cuenta, pero el proceso que corre las pruebas no. Los
// specs que se omiten sin credenciales las buscan aquí, así que hay que cargarlas.
try {
  process.loadEnvFile(".env")
} catch {
  // Sin archivo, los specs que dependen de credenciales se omiten solos.
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  // CI builds once before Playwright starts the production server. This avoids
  // route compilation races from `next dev` when the complete suite runs.
  timeout: 120_000,
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-MX",
  },
  webServer: {
    command: "INVITE_ONLY=false ./node_modules/.bin/next start",
    port: 3000,
    reuseExistingServer: false,
  },
})
