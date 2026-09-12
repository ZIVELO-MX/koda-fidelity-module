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
  // El servidor es `next dev`, que compila cada ruta la primera vez que la
  // pides. Con la suite entera eso empuja a varias pruebas por encima de los
  // 30s de fábrica, y el fallo cae en una distinta cada vez. No es lentitud de
  // la aplicación: cada spec por separado pasa de sobra.
  // ponytail: subir el techo alcanza; si molesta el tiempo total, el arreglo de
  // verdad es servir un `next build` en vez de `next dev`.
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-MX",
  },
  webServer: {
    command: "INVITE_ONLY=false pnpm dev",
    port: 3000,
    reuseExistingServer: false,
  },
})
