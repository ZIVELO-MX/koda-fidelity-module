import { afterEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("@/lib/sellado", () => ({ ejecutarSellado: vi.fn().mockRejectedValue(new Error("La tarjeta expiró")) }))

import { StampButton } from "../stamp-button"

// En el mostrador el error se borraba solo a los 3 s y era fácil no verlo.
describe("StampButton", () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it("deja el error a la vista hasta el siguiente intento", async () => {
    vi.useFakeTimers()
    render(<StampButton customerId="c1" currentStamps={2} maxStamps={10} reward="Café" brandColor="#F59E0B" />)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /sellar/i })) })
    expect(screen.getByRole("alert")).toHaveTextContent("La tarjeta expiró")
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(screen.getByRole("alert")).toHaveTextContent("La tarjeta expiró")
    expect(screen.getByRole("button", { name: /sellar/i })).toBeEnabled()
  })
})
