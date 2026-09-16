import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { RedesNegocio } from "../redes-negocio"

describe("RedesNegocio", () => {
  afterEach(() => cleanup())

  it("no ocupa sitio mientras la API no mande los campos", () => {
    const { container } = render(<RedesNegocio negocio={{}} />)
    expect(container.innerHTML).toBe("")
  })

  it("pinta los dos enlaces cuando el negocio los tiene", () => {
    render(<RedesNegocio negocio={{ website: "minegocio.com", instagram: "@kodapos" }} />)
    expect(screen.getByRole("link", { name: "Sitio web" }).getAttribute("href")).toBe(
      "https://minegocio.com/",
    )
    expect(screen.getByRole("link", { name: "Instagram" }).getAttribute("href")).toBe(
      "https://instagram.com/kodapos",
    )
  })

  it("abre fuera sin ceder la pestaña de origen", () => {
    render(<RedesNegocio negocio={{ website: "minegocio.com" }} />)
    const sitio = screen.getByRole("link", { name: "Sitio web" })
    expect(sitio.getAttribute("target")).toBe("_blank")
    expect(sitio.getAttribute("rel")).toContain("noopener")
  })

  it("pinta solo el que existe", () => {
    render(<RedesNegocio negocio={{ instagram: "kodapos", website: null }} />)
    expect(screen.getAllByRole("link")).toHaveLength(1)
  })
})
