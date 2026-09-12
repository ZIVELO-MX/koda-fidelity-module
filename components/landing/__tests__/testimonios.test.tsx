import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { Testimonios, TESTIMONIOS, TESTIMONIOS_DE_EJEMPLO } from "../testimonios"

describe("Testimonios", () => {
  afterEach(() => cleanup())

  it("no se publica sin citas reales aprobadas", () => {
    // Es la mitad de la decisión del ciclo, y la que se rompe sola si alguien
    // pega el ejemplo en la lista de verdad.
    expect(TESTIMONIOS).toHaveLength(0)
    const { container } = render(<Testimonios />)
    expect(container.innerHTML).toBe("")
  })

  it("el contenido de ejemplo está marcado como tal", () => {
    for (const ejemplo of TESTIMONIOS_DE_EJEMPLO) {
      expect(ejemplo.nombre.toLowerCase()).toContain("ejemplo")
      expect(ejemplo.negocio.toLowerCase()).toContain("ejemplo")
    }
  })

  it("pinta la cita con nombre, rol y negocio cuando las hay", () => {
    render(
      <Testimonios
        testimonios={[
          { cita: "Sé quién vuelve cada semana.", nombre: "Ana Ruiz", rol: "Dueña", negocio: "Café Aurora" },
        ]}
      />,
    )
    expect(screen.getByText("Sé quién vuelve cada semana.")).toBeTruthy()
    expect(screen.getByText("Ana Ruiz")).toBeTruthy()
    expect(screen.getByText(/Dueña de Café Aurora/)).toBeTruthy()
  })

  it("no inventa estrellas", () => {
    render(<Testimonios testimonios={TESTIMONIOS_DE_EJEMPLO} />)
    expect(screen.queryByText(/★/)).toBeNull()
  })
})
