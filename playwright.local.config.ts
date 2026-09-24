import { defineConfig } from "@playwright/test"
try { process.loadEnvFile(".env") } catch {}
export default defineConfig({
  testDir: "./e2e", fullyParallel: false, timeout: 120_000,
  use: { baseURL: "http://localhost:3200", locale: "es-MX" },
  webServer: { command: "INVITE_ONLY=false node ./node_modules/next/dist/bin/next start -p 3200", url: "http://localhost:3200", reuseExistingServer: false, timeout: 120_000, gracefulShutdown: { signal: "SIGTERM", timeout: 5000 } },
})
