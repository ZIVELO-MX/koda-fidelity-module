import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-MX",
    trace: "off",
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
