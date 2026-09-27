/**
 * Capturas de las tarjetas con los seis colores del selector, para mirar el
 * resultado del contraste además de medirlo.
 *
 * Renderiza el componente real con `react-dom/server` y la hoja de estilos que
 * dejó `pnpm build`, así que lo que se ve es la tarjeta de producción y no una
 * maqueta. Las imágenes van a `capturas/`, que no se versiona: son artefactos
 * regenerables, igual que las del resto de verificadores.
 *
 *   pnpm build
 *   pnpm exec tsx docs/design/verificadores/capturar-tarjetas.tsx
 */
import { renderToStaticMarkup } from "react-dom/server"
import { chromium } from "@playwright/test"
import { writeFileSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"

const PRESETS: [string, string][] = [
  ["Naranja", "#f97316"], ["Azul", "#3b82f6"], ["Verde", "#10b981"],
  ["Violeta", "#8b5cf6"], ["Rosa", "#ec4899"], ["Ámbar", "#f59e0b"],
]
const ACABADOS: [string, string | null][] = [
  ["lite", null], ["gradiente", "gradiente"], ["foil", "foil"],
  ["cinetico", "cinetico"], ["vidrio", "vidrio"],
]
const SALIDA = "docs/design/verificadores/capturas"

/** La hoja de Tailwind que dejó el build: la más grande de los chunks. */
function hojaDeEstilos(): string {
  const dir = ".next/static/chunks"
  const css = readdirSync(dir).filter((f) => f.endsWith(".css")).map((f) => join(dir, f))
  if (!css.length) throw new Error("No hay CSS compilado. Corre `pnpm build` antes.")
  return readFileSync(css.sort((a, b) => statSync(b).size - statSync(a).size)[0], "utf8")
}

async function main() {
  const css = hojaDeEstilos()
  const navegador = await chromium.launch()
  try {
    for (const [nombreAcabado, codigo] of ACABADOS) {
      const tarjetas = PRESETS.map(([nombre, hex]) =>
        `<div><p class="etiqueta">${nombre} ${hex}</p>` +
        renderToStaticMarkup(
          <LoyaltyCardPreview
            businessName="Panadería La Espiga" iconName="croissant" stampIconName="stamp"
            customerName="Ana Torres" currentStamps={4} maxStamps={10}
            reward="Un café gratis" expirationDate="31 dic 2026"
            brandColor={hex} themeCode={codigo} showQR={false}
          />,
        ) + "</div>",
      ).join("")

      const html = `${SALIDA}/tarjetas-${nombreAcabado}.html`
      writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${css}
body{margin:0;padding:20px;background:#f4f4f5;font-family:system-ui}
.fila{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.etiqueta{font:500 12px system-ui;margin:0 0 6px;color:#444}
</style><body><div class="fila">${tarjetas}</div></body>`)

      const pagina = await navegador.newPage({ viewport: { width: 1700, height: 640 } })
      await pagina.goto(`file://${process.cwd()}/${html}`)
      await pagina.screenshot({ path: `${SALIDA}/tarjetas-${nombreAcabado}.png`, fullPage: true })
      await pagina.close()
      console.log(`${SALIDA}/tarjetas-${nombreAcabado}.png`)
    }
  } finally {
    await navegador.close()
  }
}

void main()
