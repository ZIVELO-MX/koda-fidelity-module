import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-MX",
  },
  projects: [
    {
      name: "firefox",
      use: { browserName: "firefox" },
    },
  ],
  webServer: {
    command: "INVITE_ONLY=false pnpm dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})
