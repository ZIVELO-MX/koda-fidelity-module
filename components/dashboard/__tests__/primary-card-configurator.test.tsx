import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))

import { PrimaryCardConfigurator } from "../primary-card-configurator"

const cards = [
  { id: "active-card", name: "Tarjeta actual", reward: "Café gratis", status: "ACTIVE" as const },
  { id: "locked-card", name: "Tarjeta de respaldo", reward: "Postre gratis", status: "LOCKED_BY_PLAN" as const },
]

describe("PrimaryCardConfigurator", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("lets a Lite account choose and activate a plan-locked card", async () => {
    render(<PrimaryCardConfigurator cards={cards} primaryCardId="active-card" plan="LITE" />)
    fireEvent.click(screen.getByRole("button", { name: "Configurar tarjeta principal" }))

    expect(screen.getByText(/Lite permite una tarjeta activa/)).toBeInTheDocument()
    expect(screen.getByText("Bloqueada por el plan; puedes elegirla para activarla")).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("radio")[1])
    fireEvent.click(screen.getByRole("button", { name: "Guardar tarjeta principal" }))

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/cards/locked-card/primary", { method: "POST" }))
    expect(refresh).toHaveBeenCalledOnce()
  })

  it("explains that Pro stores the preference for a future downgrade", () => {
    render(<PrimaryCardConfigurator cards={cards} primaryCardId="active-card" plan="PRO" />)
    fireEvent.click(screen.getByRole("button", { name: "Configurar tarjeta principal" }))

    expect(screen.getByText(/Esta preferencia se conservará si la cuenta cambia a Lite/)).toBeInTheDocument()
  })

  it("shows API errors and lets the user retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "No se pudo guardar" }),
    }))
    render(<PrimaryCardConfigurator cards={cards} primaryCardId="active-card" plan="LITE" />)
    fireEvent.click(screen.getByRole("button", { name: "Configurar tarjeta principal" }))
    fireEvent.click(screen.getAllByRole("radio")[1])
    fireEvent.click(screen.getByRole("button", { name: "Guardar tarjeta principal" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar")
    expect(refresh).not.toHaveBeenCalled()
  })
})
