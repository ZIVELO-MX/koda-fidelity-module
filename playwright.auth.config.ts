import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30000,
  // Un fallo aquí se veía como un job rojo sin mensaje. Con reporte y traza, el
  // artefacto del CI dice qué pasó sin tener que reproducirlo a ciegas.
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-MX",
    trace: process.env.CI ? "retain-on-failure" : "off",
    video: "off",
    screenshot: "off",
  },
  webServer: {
    command: "pnpm start",
    port: 3000,
    reuseExistingServer: false,
    timeout: 120000,
  },
})
