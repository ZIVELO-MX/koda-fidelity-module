import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { AccountClosurePanel } from "../account-closure-panel"

const IMPACTO = {
  business: { name: "Café Aurora" },
  cards: 3,
  customers: 128,
  gracePeriodDays: 30,
  scheduledClosure: null,
}

function responder() {
  const escrituras: string[] = []
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if ((init?.method ?? "GET") === "POST") escrituras.push(url)
    return { ok: true, json: async () => (url.includes("deletion-impact") ? IMPACTO : { closure: null }) }
  }) as unknown as typeof fetch
  return escrituras
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("AccountClosurePanel", () => {
  it("no programa el cierre con un solo clic: pide escribir BORRAR", async () => {
    const escrituras = responder()
    render(<AccountClosurePanel />)
    await waitFor(() => expect(screen.getByText(/128 clientes/)).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: /programar cierre/i }))

    const confirmar = await screen.findByRole("button", { name: /^cerrar cuenta$/i })
    expect(confirmar).toBeDisabled()
    expect(escrituras).toHaveLength(0)
    expect(screen.getByText(/se cierran 3 tarjetas/i)).toBeInTheDocument()
  })

  it("con la palabra escrita sí programa el cierre", async () => {
    const escrituras = responder()
    render(<AccountClosurePanel />)
    await waitFor(() => expect(screen.getByText(/128 clientes/)).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: /programar cierre/i }))
    fireEvent.change(await screen.findByLabelText(/escribe borrar para confirmar/i), { target: { value: "borrar" } })

    const confirmar = screen.getByRole("button", { name: /^cerrar cuenta$/i })
    expect(confirmar).toBeEnabled()
    fireEvent.click(confirmar)

    await waitFor(() => expect(escrituras).toEqual(["/api/account/closure"]))
  })
})
