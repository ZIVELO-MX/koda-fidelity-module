import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { ActividadPaginada } from "../actividad-paginada"

const PAGINA_1 = {
  items: [
    { id: "l1", type: "stamp", customerName: "Ana", cardName: "Club Café", createdAt: "2026-09-22T18:00:00.000Z" },
    { id: "l2", type: "redeem", customerName: null, cardName: null, createdAt: "2026-09-22T17:00:00.000Z" },
  ],
  nextCursor: "Y3Vyc29yLTE",
}

const PAGINA_2 = {
  items: [{ id: "l3", type: "customer_joined", customerName: "Beto", cardName: "Club Café", createdAt: "2026-09-21T10:00:00.000Z" }],
  nextCursor: null,
}

function servidor(respuestas: { estado: number; cuerpo: unknown }[]) {
  const urls: string[] = []
  let i = 0
  global.fetch = vi.fn(async (url: string) => {
    urls.push(url)
    const r = respuestas[Math.min(i, respuestas.length - 1)]
    i += 1
    return {
      ok: r.estado >= 200 && r.estado < 300,
      status: r.estado,
      headers: { get: (n: string) => (n === "x-request-id" ? "req-act-1" : null) },
      json: async () => r.cuerpo,
    }
  }) as unknown as typeof fetch
  return urls
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("ActividadPaginada", () => {
  it("acumula la siguiente página en vez de sustituirla, y usa el cursor del servidor", async () => {
    const urls = servidor([{ estado: 200, cuerpo: PAGINA_1 }, { estado: 200, cuerpo: PAGINA_2 }])
    render(<ActividadPaginada />)
    await waitFor(() => expect(screen.getByText(/Ana/)).toBeInTheDocument())
    expect(urls[0]).toBe("/api/dashboard/activity?limit=20")

    fireEvent.click(screen.getByRole("button", { name: /ver más/i }))
    await waitFor(() => expect(screen.getByText(/Beto/)).toBeInTheDocument())

    // La primera sigue ahí: se continuó la lista, no se reemplazó.
    expect(screen.getByText(/Ana/)).toBeInTheDocument()
    expect(urls[1]).toBe("/api/dashboard/activity?limit=20&cursor=Y3Vyc29yLTE")
  })

  it("sin cursor deja de ofrecer más, en vez de pedir una página vacía", async () => {
    servidor([{ estado: 200, cuerpo: PAGINA_1 }, { estado: 200, cuerpo: PAGINA_2 }])
    render(<ActividadPaginada />)
    await waitFor(() => expect(screen.getByRole("button", { name: /ver más/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: /ver más/i }))
    await waitFor(() => expect(screen.queryByRole("button", { name: /ver más/i })).toBeNull())
  })

  it("un movimiento sin cliente ni tarjeta lo dice, no lo rellena", async () => {
    servidor([{ estado: 200, cuerpo: PAGINA_1 }])
    render(<ActividadPaginada />)
    await waitFor(() => expect(screen.getByText(/sin cliente/)).toBeInTheDocument())
    expect(screen.getByText(/sin tarjeta/)).toBeInTheDocument()
  })

  it("sin movimientos lo dice en vez de dejar un hueco", async () => {
    servidor([{ estado: 200, cuerpo: { items: [], nextCursor: null } }])
    render(<ActividadPaginada />)
    await waitFor(() => expect(screen.getByText(/todavía no hay movimientos/i)).toBeInTheDocument())
  })

  it("un cursor inválido se explica y no ofrece reintentar en bucle", async () => {
    servidor([{ estado: 400, cuerpo: { error: "Cursor inválido", code: "KF-REQUEST-001", action: "Solicita la siguiente página desde el cursor recibido.", requestId: "req-400", retryable: false } }])
    render(<ActividadPaginada />)
    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent("Cursor inválido")
    expect(alerta).toHaveTextContent("req-400")
    expect(screen.queryByRole("button", { name: /reintentar/i })).toBeNull()
  })

  it("un error del servidor sí se puede reintentar", async () => {
    servidor([{ estado: 500, cuerpo: { error: "Internal server error", code: "KF-SYS-001", action: "Inténtalo de nuevo más tarde.", requestId: "req-500", retryable: true } }])
    render(<ActividadPaginada />)
    expect(await screen.findByRole("button", { name: /reintentar/i })).toBeEnabled()
  })
})
