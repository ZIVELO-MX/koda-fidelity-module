import { render, screen } from "@testing-library/react"
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
    render(
      <LoyaltyCardPreview
        businessName="Cafetería"
        customerName="Ana"
        currentStamps={0}
        maxStamps={2}
        reward="Café gratis"
        textColor="DARK"
        showQR={false}
      />,
    )

    expect(screen.getAllByText("Ana").some((element) => element.getAttribute("style")?.includes("rgb(23, 23, 23)"))).toBe(true)
  })
})
