// Configuración separada de la del producto: no levanta el servidor de
// desarrollo porque los entregables de diseño son archivos estáticos.
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./docs/design/verificadores",
  fullyParallel: true,
  use: { locale: "es-MX" },
  projects: [
    { name: "movil", use: { viewport: { width: 375, height: 812 } } },
    { name: "tableta", use: { viewport: { width: 768, height: 1024 } } },
    { name: "escritorio", use: { viewport: { width: 1440, height: 900 } } },
  ],
})
