import { defineConfig } from "@playwright/test"
export default defineConfig({
  testDir: "./e2e", fullyParallel: false, workers: 1, timeout: 120_000,
  reporter: [["list", { printSteps: false }]],
  use: { baseURL: "http://localhost:3200", locale: "es-MX", trace: "retain-on-failure" },
  webServer: {
    command: "node ./node_modules/next/dist/bin/next start -p 3200",
    url: "http://localhost:3200", reuseExistingServer: false, timeout: 120_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
})
