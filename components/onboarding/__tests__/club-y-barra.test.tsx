import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { Club, TarjetaGuardada } from "../alta"
import { BarraDePasos } from "../barra-de-pasos"
import type { EstadoDelAlta } from "@/lib/onboarding"

const ESTADO: EstadoDelAlta = {
  step: "ACQUISITION",
  status: "IN_PROGRESS",
  draftVersion: 4,
  negocio: { name: "Café Aurora", categoryId: "cat-1" },
  tarjeta: { name: "Club Café Aurora", reward: "Décimo gratis", stampsRequired: 10, brandColor: "#c2410c", themeId: undefined },
  acquisitionSource: null,
  selectedBillingInterval: null,
  primeraTarjetaId: "card-1",
  categorias: [],
  temas: [],
  modo: "live",
  plan: "LITE",
  nombreDeLaCuenta: "Café Aurora",
  correoDeLaCuenta: "raul@cafeaurora.mx",
}

/** El QR de `qrcode.react` es lo único que se pinta con `crispEdges`, y el
 *  atributo va en el `path`, no en el `svg`. */
const hayQr = (raiz: HTMLElement) => raiz.querySelectorAll('path[shape-rendering="crispEdges"]').length > 0

afterEach(cleanup)

describe("La barra de pasos", () => {
  it("no escribe «opcional»: la forma ya lo dice", () => {
    const { container } = render(<BarraDePasos actual="ACQUISITION" />)
    expect(container.textContent).not.toMatch(/opcional/i)
  })

  it("distingue los saltables por contorno y los obligatorios por relleno", () => {
    render(<BarraDePasos actual="ACQUISITION" />)
    // «Origen» es saltable y es el paso actual: va en contorno.
    expect(screen.getByText("Origen").className).toMatch(/border/)
    // «Plan» es obligatorio y todavía no se alcanza: va relleno, sin contorno.
    expect(screen.getByText("Plan").className).not.toMatch(/border/)
  })
})

describe("El Club, el momento de llegada", () => {
  it("enseña la tarjeta entera, con su QR", () => {
    const { container } = render(<Club estado={ESTADO} />)
    expect(screen.getByRole("heading", { name: "Club Café Aurora" })).toBeInTheDocument()
    expect(hayQr(container)).toBe(true)
  })
})

describe("La tarjeta detrás del muro", () => {
  it("sigue sin QR: sin publicar no se genera código", () => {
    const { container } = render(<TarjetaGuardada estado={{ ...ESTADO, step: "PAYWALL", status: "AWAITING_PAYMENT" }} />)
    expect(hayQr(container)).toBe(false)
  })
})
