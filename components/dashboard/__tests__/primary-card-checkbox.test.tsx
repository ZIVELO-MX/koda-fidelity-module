import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { PrimaryCardCheckbox } from "../primary-card-checkbox"

afterEach(cleanup)

describe("PrimaryCardCheckbox", () => {
  it("warns a Lite user that selecting the new card replaces the current active card", () => {
    render(
      <PrimaryCardCheckbox
        inputId="primary"
        checked
        onCheckedChange={vi.fn()}
        plan="LITE"
        cardName="Tarjeta dos"
        currentPrimaryName="Tarjeta uno"
      />,
    )

    expect(screen.getByRole("checkbox", { name: "Marcar como tarjeta principal" })).toBeChecked()
    expect(screen.getByText(/Lite permite una sola tarjeta activa/)).toHaveTextContent(
      "Tarjeta uno dejará de estar activa y Tarjeta dos será la única activa.",
    )
  })

  it("explains that an unchecked Lite card is saved blocked while the current primary stays active", () => {
    render(
      <PrimaryCardCheckbox
        inputId="primary"
        checked={false}
        onCheckedChange={vi.fn()}
        plan="LITE"
        cardName="Tarjeta dos"
        currentPrimaryName="Tarjeta uno"
      />,
    )

    expect(screen.getByText(/guardará bloqueada por el plan/)).toHaveTextContent(
      "Tarjeta uno seguirá como la única tarjeta activa.",
    )
  })

  it("names the Pro card that will remain active after a downgrade", () => {
    render(
      <PrimaryCardCheckbox
        inputId="primary"
        checked
        onCheckedChange={vi.fn()}
        plan="PRO"
        cardName="Tarjeta favorita"
      />,
    )

    expect(screen.getByText("Tarjeta favorita será la única tarjeta activa al cambiar a Lite.")).toBeInTheDocument()
  })

  it("reports checkbox changes to the create or edit form", () => {
    const onCheckedChange = vi.fn()
    render(
      <PrimaryCardCheckbox
        inputId="primary"
        checked
        onCheckedChange={onCheckedChange}
        plan="PRO"
        cardName="Tarjeta principal"
      />,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "Marcar como tarjeta principal" }))
    expect(onCheckedChange).toHaveBeenCalledWith(false)
  })
})
