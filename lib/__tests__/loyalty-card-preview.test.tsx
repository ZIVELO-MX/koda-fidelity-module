import { renderToStaticMarkup } from "react-dom/server"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"

describe("LoyaltyCardPreview", () => {
  it("uses the configured stamp icon instead of the card icon", () => {
    const { container } = render(
      <LoyaltyCardPreview
        businessName="Cafetería"
        iconName="coffee"
        stampIconName="star"
        customerName="Ana"
        currentStamps={1}
        maxStamps={2}
        reward="Café gratis"
        showQR={false}
      />,
    )

    expect(screen.getByText("Cafetería")).toBeInTheDocument()
    expect(container.querySelector(".lucide-coffee")).toBeInTheDocument()
    expect(container.querySelector(".lucide-star")).toBeInTheDocument()
  })

  it("honors a forced dark text color", () => {
    // Se consulta solo esta tarjeta: el DOM de la prueba anterior sigue montado,
    // y su «Ana» en automático sobre naranja ya es tinta, así que buscar en toda
    // la pantalla pasaba aunque el negro forzado no se aplicara. Y el violeta es
    // un color donde automático pondría blanco: solo pasa si se respeta el negro.
    const { container } = render(
      <LoyaltyCardPreview
        businessName="Cafetería"
        customerName="Ana"
        currentStamps={0}
        maxStamps={2}
        reward="Café gratis"
        brandColor="#8b5cf6"
        textColor="DARK"
        showQR={false}
      />,
    )

    // El negro forzado es la tinta del sistema (#1C1B17), la misma con la que
    // la piel mide el contraste: así la garantía de lectura vale para él.
    expect(within(container).getByText("Ana").getAttribute("style")).toContain("rgb(28, 27, 23)")
  })

  it("con blanco forzado sobre un color claro, conserva el fondo", () => {
    const html = renderToStaticMarkup(
      <LoyaltyCardPreview businessName="Panadería" currentStamps={0} maxStamps={2} reward="Pan" brandColor="#f59e0b" textColor="LIGHT" showQR={false} />,
    )
    expect(html).toContain("radial-gradient(")
    expect(html).toContain("color:#FFFFFF")
    expect(html).toMatch(/radial-gradient\([^,]*,\s*#F59E0B/i)
  })
})
