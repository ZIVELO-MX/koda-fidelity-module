import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup, within } from "@testing-library/react"
import { TarjetaGuardada } from "../alta"
import type { EstadoDelAlta } from "@/lib/onboarding"

const ESTADO: EstadoDelAlta = {
  step: "PAYWALL",
  status: "AWAITING_PAYMENT",
  draftVersion: 3,
  negocio: { name: "Café Aurora", categoryId: "cat-1" },
  tarjeta: { name: "Club Café Aurora", reward: "Décimo gratis", stampsRequired: 10, brandColor: "#c2410c", themeId: "theme-pro-foil" },
  acquisitionSource: null,
  selectedBillingInterval: "ANNUAL",
  primeraTarjetaId: "card-1",
  categorias: [],
  temas: [
    { id: "theme-cafeteria", code: "cafeteria", plan: "LITE" },
    { id: "theme-pro-foil", code: "foil", plan: "PRO" },
  ],
  modo: "live",
  plan: "LITE",
  nombreDeLaCuenta: "Café Aurora",
}

afterEach(cleanup)

describe("TarjetaGuardada, detrás del muro de pago", () => {
  it("dice que la tarjeta no está publicada y que nada se perdió", () => {
    render(<TarjetaGuardada estado={ESTADO} />)
    expect(screen.getByText(/todavía no publicada/i)).toBeInTheDocument()
    expect(screen.getByText(/siguen guardados/i)).toBeInTheDocument()
  })

  it("las tres acciones del QR no se habilitan, pero siguen alcanzables con teclado", () => {
    render(<TarjetaGuardada estado={ESTADO} />)
    for (const accion of ["Compartir", "Descargar", "Imprimir"]) {
      const boton = screen.getByRole("button", { name: accion })
      expect(boton).toHaveAttribute("aria-disabled", "true")
      // `disabled` sacaría el botón del orden de tabulación y con él la razón.
      expect(boton).not.toBeDisabled()
    }
  })

  it("la razón está enlazada desde el control, no solo escrita al lado", () => {
    render(<TarjetaGuardada estado={ESTADO} />)
    const boton = screen.getByRole("button", { name: "Compartir" })
    const id = boton.getAttribute("aria-describedby")
    expect(id).toBeTruthy()
    expect(document.getElementById(id!)).toHaveTextContent(/código qr/i)
  })

  it("un acabado Pro sin plan que lo sostenga no se pinta, pero tampoco se pierde", () => {
    // El servidor manda el efectivo en null cuando el plan no sostiene el
    // acabado. Aquí se comprueba lo mismo: con Lite la tarjeta se pinta igual
    // que si no hubiera tema, y con Pro se pinta distinto.
    const pintar = (estado: EstadoDelAlta) => {
      const { container } = render(<TarjetaGuardada estado={estado} />)
      const estilos = Array.from(container.querySelectorAll<HTMLElement>("[style]"))
        .map((n) => n.getAttribute("style"))
        .join("|")
      cleanup()
      return estilos
    }

    const conLite = pintar(ESTADO)
    const sinTema = pintar({ ...ESTADO, tarjeta: { ...ESTADO.tarjeta, themeId: undefined } })
    const conPro = pintar({ ...ESTADO, plan: "PRO" })

    expect(conLite).toBe(sinTema)
    expect(conPro).not.toBe(conLite)
    // Y la selección sigue intacta en el borrador: no se aplica, no se borra.
    expect(ESTADO.tarjeta.themeId).toBe("theme-pro-foil")
  })

  it("nombra el negocio de la cuenta cuando el borrador no trae nombre", () => {
    render(<TarjetaGuardada estado={{ ...ESTADO, negocio: {} }} />)
    const seccion = screen.getByText(/todavía no publicada/i).closest("section") as HTMLElement
    expect(within(seccion).getAllByText(/Café Aurora/i).length).toBeGreaterThan(0)
  })
})
