import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30000,
  globalTimeout: process.env.CI ? 5 * 60_000 : undefined,
  // El `list` con pasos y fallos en línea viene de FID-0016 y dice qué pasó en
  // el propio log. El `html` y la traza son lo mismo pero descargable, para
  // cuando el job se cae sin que el log alcance a contarlo.
  reporter: process.env.CI
    ? [["list", { printSteps: true, printFailuresInline: true }], ["html", { open: "never" }]]
    : [["list", { printSteps: true, printFailuresInline: true }]],
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-MX",
    trace: process.env.CI ? "retain-on-failure" : "off",
    video: "off",
    screenshot: "off",
  },
  // Invocar `next` directo y no por `pnpm`, más el apagado ordenado, son el
  // arreglo del cuelgue de FID-0016: pnpm no reenvía la señal al hijo.
  webServer: {
    command: "node ./node_modules/next/dist/bin/next start -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
})
