import { describe, it, expect } from "vitest"
import { createRef } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { Tarjeta, TarjetaLista } from "../alta"
import type { EstadoDelAlta } from "@/lib/onboarding"

/**
 * Benji no veía los temas Pro en el alta: estaban en la lista, pero la vista
 * previa solo aplicaba un acabado Pro con plan Pro, y en el alta el plan es Lite.
 * Donde se elige se ve lo elegido; donde se publica, el tema efectivo.
 *
 * `renderToStaticMarkup` y no jsdom: jsdom descarta los degradados al leer el CSS.
 */
const estado: EstadoDelAlta = {
  step: "CARD", status: "IN_PROGRESS", draftVersion: 3,
  negocio: { name: "Café Aurora", categoryId: "cat-1" },
  tarjeta: { name: "Club", reward: "Décimo gratis", stampsRequired: 10, brandColor: "#c2410c", themeId: "theme-gradiente", textColor: "AUTO" },
  acquisitionSource: null, selectedBillingInterval: null, primeraTarjetaId: "card-1", categorias: [],
  temas: [{ id: "theme-gradiente", code: "gradiente", plan: "PRO" }],
  modo: "live", plan: "LITE", nombreDeLaCuenta: "Café Aurora", correoDeLaCuenta: "raul@cafeaurora.mx",
}
/** El acabado `gradiente` es el único que pinta un `linear-gradient` a 150°. */
const hayGradiente = (html: string) => html.includes("linear-gradient(150deg")
const nada = () => {}

describe("Temas Pro en el alta", () => {
  it("la vista previa del paso de la tarjeta enseña el acabado Pro elegido con plan Lite", () => {
    expect(hayGradiente(renderToStaticMarkup(<Tarjeta estado={estado} onCambio={nada} onCambioLocal={nada} errorRecompensa={false} recompensaRef={createRef<HTMLInputElement>()} onRecompensaCorregida={nada} />))).toBe(true)
  })
  it("«Tarjeta lista» muestra la elección Pro como vista previa con Lite y explica cuándo se aplica", () => {
    const estadoLite = { ...estado, step: "CARD_READY" as const }
    const html = renderToStaticMarkup(<TarjetaLista estado={estadoLite} />)
    expect(hayGradiente(html)).toBe(true)
    expect(html).toContain("Estás viendo el acabado Pro que elegiste.")
    expect(html).toContain("con Lite, la tarjeta se publica con el color de tu negocio.")

    const htmlEnPaywall = renderToStaticMarkup(<TarjetaLista estado={estadoLite} soloTarjeta />)
    expect(hayGradiente(htmlEnPaywall)).toBe(true)
    expect(htmlEnPaywall).toContain("Estás viendo el acabado Pro que elegiste.")
  })
  it("«Tarjeta lista» con Pro sí lo pinta", () => {
    expect(hayGradiente(renderToStaticMarkup(<TarjetaLista estado={{ ...estado, step: "CARD_READY", plan: "PRO" }} />))).toBe(true)
  })
})
