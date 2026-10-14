import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: PropsWithChildren<{ href: string }>) => <a href={href} {...props}>{children}</a> }))
vi.mock("@/components/loyalty-card-preview", () => ({ LoyaltyCardPreview: () => <div data-testid="card-preview" /> }))
vi.mock("@/components/dashboard/icon-picker", () => ({ IconPicker: () => <div /> }))
vi.mock("@/components/dashboard/text-color-picker", () => ({ TextColorPicker: () => <div /> }))
vi.mock("@/components/dashboard/expiration-picker", () => ({ ExpirationPicker: () => <div /> }))
vi.mock("@/components/aviso-de-color-de-texto", () => ({ AvisoDeColorDeTexto: () => null }))
vi.mock("@/components/dashboard/tema-pro-requiere-pro-alert", () => ({ TemaProRequiereProAlert: () => null }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import CreateCardPage from "./page"

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

describe("CreateCardPage primary card selection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/business") return jsonResponse({ business: { name: "Café Aurora" } })
      if (String(input) === "/api/card-themes") return jsonResponse({
        themes: [],
        plan: "LITE",
        primaryCardId: "current-card",
        primaryCardName: "Tarjeta actual",
      })
      if (String(input) === "/api/cards" && init?.method === "POST") {
        return jsonResponse({ card: { id: "new-card", status: "LOCKED_BY_PLAN" } }, 201)
      }
      throw new Error(`Unexpected fetch: ${String(input)}`)
    }))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("posts an unchecked Lite card as plan-locked and returns to the card list", async () => {
    render(<CreateCardPage />)
    const checkbox = await screen.findByRole("checkbox", { name: "Marcar como tarjeta principal" })
    expect(checkbox).not.toBeChecked()
    expect(screen.getByText(/Tarjeta actual seguirá como la única tarjeta activa/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("¿Qué se lleva el cliente?"), { target: { value: "Café gratis" } })
    fireEvent.change(screen.getByLabelText("¿Cómo se llama la tarjeta?"), { target: { value: "Tarjeta nueva" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar bloqueada" }))

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/cards"))
    const postCall = vi.mocked(fetch).mock.calls.find(([url, init]) => url === "/api/cards" && init?.method === "POST")
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({ name: "Tarjeta nueva", isPrimary: false })
  })
})
