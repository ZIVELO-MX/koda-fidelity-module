import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    // docs/** lleva pruebas de Playwright, que no corren bajo vitest.
    exclude: ["e2e/**", "docs/**", "node_modules/**"],
    setupFiles: ["./lib/__tests__/setup.ts"],
  },
})
