import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30000,
  globalTimeout: process.env.CI ? 5 * 60_000 : undefined,
  reporter: [["list", { printSteps: true, printFailuresInline: true }]],
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-MX",
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: {
    command: "node ./node_modules/next/dist/bin/next start -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
})
