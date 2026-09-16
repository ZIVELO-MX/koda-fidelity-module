import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { CustomerRowAction } from "../customer-row-action"

const refresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))

const fetchMock = vi.fn()

function pintar(currentStamps: number, maxStamps = 10) {
  return render(
    <CustomerRowAction customerId="cust-1" currentStamps={currentStamps} maxStamps={maxStamps} />,
  )
}

describe("CustomerRowAction", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    refresh.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("sella cuando la tarjeta va a medias", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ event: "stamp" }) })
    pintar(3)
    fireEvent.click(screen.getByRole("button", { name: /sellar/i }))

    const [ruta, opciones] = fetchMock.mock.calls.at(-1)!
    expect(ruta).toBe("/api/stamps")
    expect(JSON.parse(opciones.body)).toEqual({ customerId: "cust-1", type: "stamp" })
  })

  it("canjea cuando la tarjeta está completa", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ event: "redeem" }) })
    pintar(10)
    fireEvent.click(screen.getByRole("button", { name: /canjear/i }))

    const [, opciones] = fetchMock.mock.calls.at(-1)!
    expect(JSON.parse(opciones.body)).toEqual({ customerId: "cust-1", type: "redeem" })
  })

  it("refresca la lista después de registrar", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ event: "stamp" }) })
    pintar(3)
    fireEvent.click(screen.getByRole("button", { name: /sellar/i }))
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it("dice que no se pudo cuando el servidor rechaza", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) })
    pintar(3)
    fireEvent.click(screen.getByRole("button", { name: /sellar/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo registrar/i)
    expect(refresh).not.toHaveBeenCalled()
  })

  it("anuncia el bono en la propia celda, sin diálogo", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        event: "stamp",
        milestoneClaim: { id: "m1", label: "Postre gratis", iconName: null },
      }),
    })
    pintar(3)
    fireEvent.click(screen.getByRole("button", { name: /sellar/i }))
    expect(await screen.findByRole("status")).toHaveTextContent(/bono sorpresa: postre gratis/i)
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })
})
