import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { SelectorDeColorDeTexto, SelectorDeTema } from "../selector-de-tema"
import type { Tema } from "@/lib/onboarding"

const TEMAS: Tema[] = [
  { id: "theme-cafeteria", code: "cafeteria", plan: "LITE" },
  { id: "theme-gradiente", code: "gradiente", plan: "PRO" },
]

afterEach(cleanup)

describe("SelectorDeTema", () => {
  it("ofrece los acabados Pro marcados, no bloqueados", () => {
    render(<SelectorDeTema temas={TEMAS} elegido={null} plan="LITE" onElegir={() => {}} />)
    const pro = screen.getByRole("button", { name: /Gradiente/ })
    expect(pro).toHaveTextContent("Pro")
    expect(pro).not.toBeDisabled()
  })

  it("con Lite y un acabado Pro elegido, avisa de que se publica con el color del negocio", () => {
    render(<SelectorDeTema temas={TEMAS} elegido="theme-gradiente" plan="LITE" onElegir={() => {}} />)
    expect(screen.getByText(/se publica con tu color/)).toBeInTheDocument()
  })

  it("con Pro no avisa de nada", () => {
    render(<SelectorDeTema temas={TEMAS} elegido="theme-gradiente" plan="PRO" onElegir={() => {}} />)
    expect(screen.queryByText(/se publica con tu color/)).toBeNull()
  })

  it("«Solo color» quita el tema, y solo aparece donde se pide", () => {
    const onElegir = vi.fn()
    const { rerender } = render(<SelectorDeTema temas={TEMAS} elegido="theme-cafeteria" plan="LITE" onElegir={onElegir} conSoloColor />)
    fireEvent.click(screen.getByRole("button", { name: "Solo color" }))
    expect(onElegir).toHaveBeenCalledWith(null)
    rerender(<SelectorDeTema temas={TEMAS} elegido="theme-cafeteria" plan="LITE" onElegir={onElegir} />)
    expect(screen.queryByRole("button", { name: "Solo color" })).toBeNull()
  })

  it("sin catálogo no pinta nada", () => {
    const { container } = render(<SelectorDeTema temas={[]} elegido={null} plan="LITE" onElegir={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe("SelectorDeColorDeTexto", () => {
  const pinta = (valor: "AUTO" | "DARK" | "LIGHT", brandColor: string, themeCode: string | null = null) =>
    render(<SelectorDeColorDeTexto valor={valor} onCambio={() => {}} brandColor={brandColor} themeCode={themeCode} />)

  it("en automático no avisa de nada", () => {
    pinta("AUTO", "#f59e0b")
    expect(screen.queryByText(/se ajusta|va en blanco/)).toBeNull()
  })

  it("blanco sobre ámbar avisa de que el tono se ajusta, para que no parezca un error", () => {
    pinta("LIGHT", "#f59e0b")
    expect(screen.getByText(/el tono de la tarjeta se ajusta/)).toBeInTheDocument()
  })

  it("negro sobre ámbar no mueve nada, así que no avisa", () => {
    pinta("DARK", "#f59e0b")
    expect(screen.queryByText(/se ajusta/)).toBeNull()
  })

  it("negro sobre Gradiente vivo explica que el texto se queda en blanco", () => {
    pinta("DARK", "#f97316", "gradiente")
    expect(screen.getByText(/Gradiente vivo el texto va en blanco/)).toBeInTheDocument()
  })

  it("elegir cambia el valor", () => {
    const onCambio = vi.fn()
    render(<SelectorDeColorDeTexto valor="AUTO" onCambio={onCambio} brandColor="#f97316" themeCode={null} />)
    fireEvent.click(screen.getByRole("button", { name: "Blanco" }))
    expect(onCambio).toHaveBeenCalledWith("LIGHT")
  })
})
