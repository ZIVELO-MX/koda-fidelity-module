import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { AvisoDeColorDeTexto } from "../aviso-de-color-de-texto"

afterEach(cleanup)

describe("AvisoDeColorDeTexto", () => {
  it("en automático no dice nada", () => {
    const { container } = render(<AvisoDeColorDeTexto brandColor="#f59e0b" themeCode={null} textColor="AUTO" />)
    expect(container).toBeEmptyDOMElement()
  })
  it("claro sobre ámbar avisa de que el tono se ajusta", () => {
    render(<AvisoDeColorDeTexto brandColor="#f59e0b" themeCode={null} textColor="LIGHT" />)
    expect(screen.getByText(/el tono de la tarjeta se ajusta/)).toBeInTheDocument()
  })
  it("oscuro sobre ámbar no mueve nada, así que calla", () => {
    const { container } = render(<AvisoDeColorDeTexto brandColor="#f59e0b" themeCode={null} textColor="DARK" />)
    expect(container).toBeEmptyDOMElement()
  })
  it("oscuro sobre Gradiente vivo explica que va claro", () => {
    render(<AvisoDeColorDeTexto brandColor="#f97316" themeCode="gradiente" textColor="DARK" />)
    expect(screen.getByText(/Gradiente vivo el texto va claro/)).toBeInTheDocument()
  })
})
