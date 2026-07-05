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
})
