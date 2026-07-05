import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CustomerCardListIcon } from "@/components/dashboard/customer-card-list-icon"

const defaultProps = {
  businessLogo: "https://example.com/logo.png",
  businessName: "Cafetería",
  brandColor: "#f97316",
}

describe("CustomerCardListIcon", () => {
  it("renders the card icon even when the business has a logo", () => {
    const { container } = render(
      <CustomerCardListIcon {...defaultProps} iconName="coffee" />,
    )

    expect(container.querySelector(".lucide-coffee")).toBeInTheDocument()
    expect(container.querySelector("img")).not.toBeInTheDocument()
  })

  it("renders the business logo when the card explicitly selects it", () => {
    const { container } = render(
      <CustomerCardListIcon {...defaultProps} iconName="logo" />,
    )

    expect(container.querySelector("img")).toHaveAttribute("src", defaultProps.businessLogo)
  })

  it("does not inherit the business icon when the card has no icon", () => {
    const { container } = render(
      <CustomerCardListIcon {...defaultProps} iconName={null} />,
    )

    expect(container.querySelector("svg")).not.toBeInTheDocument()
    expect(container.querySelector("img")).not.toBeInTheDocument()
    expect(container).toHaveTextContent("C")
  })
})
