import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { AvisoDeColorDeTexto } from "../aviso-de-color-de-texto"

afterEach(cleanup)

describe("AvisoDeColorDeTexto", () => {
  it("en automático no dice nada", () => {
    const { container } = render(<AvisoDeColorDeTexto brandColor="#f59e0b" themeCode={null} textColor="AUTO" />)
    expect(container).toBeEmptyDOMElement()
  })
  it("claro sobre ámbar avisa del contraste sin ajustar el tono", () => {
    render(<AvisoDeColorDeTexto brandColor="#f59e0b" themeCode={null} textColor="LIGHT" />)
    expect(screen.getByText(/El texto claro puede tener poco contraste/)).toBeInTheDocument()
  })
  it("oscuro sobre ámbar no mueve nada, así que calla", () => {
    const { container } = render(<AvisoDeColorDeTexto brandColor="#f59e0b" themeCode={null} textColor="DARK" />)
    expect(container).toBeEmptyDOMElement()
  })
  it("oscuro sobre Gradiente vivo avisa del contraste sin cambiar el texto", () => {
    render(<AvisoDeColorDeTexto brandColor="#f97316" themeCode="gradiente" textColor="DARK" />)
    expect(screen.getByText(/El texto oscuro puede tener poco contraste con Gradiente vivo/)).toBeInTheDocument()
  })
})
