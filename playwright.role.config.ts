import { defineConfig } from "@playwright/test"

if (!process.env.E2E_BASE_URL) {
  throw new Error("E2E_BASE_URL is required for role-permissions smoke tests")
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL,
    locale: "es-MX",
  },
})
