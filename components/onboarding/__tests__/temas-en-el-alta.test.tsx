import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { Club, Tarjeta } from "../alta"
import type { EstadoDelAlta } from "@/lib/onboarding"

/**
 * Los temas en el alta.
 *
 * Se renderiza con `renderToStaticMarkup` y no con el DOM de jsdom: jsdom
 * descarta al interpretar el CSS los degradados que no entiende, y la prueba
 * pasaría o fallaría por el parser, no por el componente.
 */
const base: EstadoDelAlta = {
  step: "CARD",
  status: "IN_PROGRESS",
  draftVersion: 3,
  negocio: { name: "Café Aurora", categoryId: "cat-1" },
  tarjeta: { name: "Club Café Aurora", reward: "Décimo gratis", stampsRequired: 10, brandColor: "#c2410c", themeId: undefined },
  acquisitionSource: null,
  selectedBillingInterval: null,
  primeraTarjetaId: "card-1",
  categorias: [],
  temas: [
    { id: "theme-cafeteria", code: "cafeteria", plan: "LITE" },
    { id: "theme-gradiente", code: "gradiente", plan: "PRO" },
  ],
  modo: "live",
  plan: "LITE",
  nombreDeLaCuenta: "Café Aurora",
  correoDeLaCuenta: "raul@cafeaurora.mx",
}
const con = (themeId: string, plan: "LITE" | "PRO" = "LITE"): EstadoDelAlta =>
  ({ ...base, plan, tarjeta: { ...base.tarjeta, themeId } })

/** El acabado `gradiente` es el único que pinta un `linear-gradient` a 150°. */
const hayGradiente = (html: string) => html.includes("linear-gradient(150deg")
/** El patrón de íconos de un giro va en una capa oculta a lectores con `overflow-hidden`. */
const hayPatron = (html: string) => /aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden"/.test(html)
const nada = () => {}

describe("La vista previa del paso de la tarjeta", () => {
  it("enseña el acabado Pro elegido aunque el plan sea Lite: probarlo es lo que empuja a contratar", () => {
    const html = renderToStaticMarkup(<Tarjeta estado={con("theme-gradiente")} onCambio={nada} onCambioLocal={nada} />)
    expect(hayGradiente(html)).toBe(true)
  })

  it("con Lite avisa de que se publica con el color del negocio", () => {
    const html = renderToStaticMarkup(<Tarjeta estado={con("theme-gradiente")} onCambio={nada} onCambioLocal={nada} />)
    expect(html).toMatch(/se publica con tu color/)
  })
})

describe("El Club, «así lo verán tus clientes»", () => {
  it("pinta el tema Lite elegido, que es lo que verá el cliente", () => {
    expect(hayPatron(renderToStaticMarkup(<Club estado={con("theme-cafeteria")} />))).toBe(true)
  })

  it("no pinta un acabado Pro que el plan no sostiene: el cliente vería el color del negocio", () => {
    expect(hayGradiente(renderToStaticMarkup(<Club estado={con("theme-gradiente")} />))).toBe(false)
  })

  it("con Pro, sí lo pinta", () => {
    expect(hayGradiente(renderToStaticMarkup(<Club estado={con("theme-gradiente", "PRO")} />))).toBe(true)
  })
})
