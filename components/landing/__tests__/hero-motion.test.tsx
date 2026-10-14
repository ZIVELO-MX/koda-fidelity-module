import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import { TarjetaDelHero } from "../tarjeta-del-hero"
import { siteConfig } from "@/lib/site-config"

vi.mock("@/components/loyalty-card-preview", () => ({
  LoyaltyCardPreview: ({ currentStamps }: { currentStamps: number }) => <span data-testid="sellos">{currentStamps}</span>,
}))

let reduced = false
let change: (() => void) | undefined
beforeEach(() => {
  vi.useFakeTimers()
  reduced = false
  vi.stubGlobal("matchMedia", () => ({
    get matches() { return reduced },
    addEventListener: (_: string, listener: () => void) => { change = listener },
    removeEventListener: () => { change = undefined },
  }))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("Movimiento del hero", () => {
  it("muestra el sello final sin temporizador con movimiento reducido", () => {
    reduced = true
    render(<TarjetaDelHero />)
    expect(screen.getByTestId("sellos")).toHaveTextContent(String(siteConfig.hero.demoCard.currentStamps + 1))
    expect(vi.getTimerCount()).toBe(0)
  })

  it("cancela la animación si la preferencia cambia durante la espera", () => {
    render(<TarjetaDelHero />)
    expect(screen.getByTestId("sellos")).toHaveTextContent(String(siteConfig.hero.demoCard.currentStamps))
    act(() => { reduced = true; change?.() })
    expect(screen.getByTestId("sellos")).toHaveTextContent(String(siteConfig.hero.demoCard.currentStamps + 1))
    expect(vi.getTimerCount()).toBe(0)
  })
})
