import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { MetricasHistoricas } from "../metricas-historicas"

const DATOS = {
  period: { from: "2026-08-24T00:00:00.000Z", to: "2026-09-23T00:00:00.000Z", timezone: "America/Mexico_City" },
  totals: { activeCards: 2, activeCustomers: 40, stamps: 120, redemptions: 8, completedCycles: 10, redemptionRate: 0.8 },
  daily: [
    { date: "2026-09-21", stamps: 4, redemptions: 1 },
    { date: "2026-09-22", stamps: 9, redemptions: 0 },
  ],
  weeklyNewCustomers: [{ weekStart: "2026-09-21", count: 3 }],
  topCards: [
    { id: "c1", name: "Club Café", stamps: 100, redemptions: 8, lastActivityAt: "2026-09-22T18:00:00.000Z" },
    { id: "c2", name: "Club Postres", stamps: 0, redemptions: 0, lastActivityAt: null },
  ],
}

function responder(estado: number, cuerpo: unknown, requestId = "req-abc-123") {
  const llamadas: string[] = []
  global.fetch = vi.fn(async (url: string) => {
    llamadas.push(url)
    return {
      ok: estado >= 200 && estado < 300,
      status: estado,
      headers: { get: (n: string) => (n === "x-request-id" ? requestId : null) },
      json: async () => cuerpo,
    }
  }) as unknown as typeof fetch
  return llamadas
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("MetricasHistoricas", () => {
  it("pide el periodo por defecto y lo cambia sin recargar la página", async () => {
    const llamadas = responder(200, DATOS)
    render(<MetricasHistoricas />)
    await waitFor(() => expect(screen.getByText("Club Café")).toBeInTheDocument())
    expect(llamadas[0]).toBe("/api/dashboard/stats?days=30")

    fireEvent.click(screen.getByRole("radio", { name: "7 días" }))
    await waitFor(() => expect(llamadas).toContain("/api/dashboard/stats?days=7"))
  })

  it("un canje sin tarjetas llenas no se pinta como 0%", async () => {
    responder(200, { ...DATOS, totals: { ...DATOS.totals, completedCycles: 0, redemptionRate: null } })
    render(<MetricasHistoricas />)
    await waitFor(() => expect(screen.getByText("Sin tarjetas llenas todavía")).toBeInTheDocument())
    expect(screen.getByText("—")).toBeInTheDocument()
    expect(screen.queryByText("0%")).toBeNull()
  })

  it("una tarjeta sin movimiento no lleva fecha inventada", async () => {
    responder(200, DATOS)
    render(<MetricasHistoricas />)
    await waitFor(() => expect(screen.getByText("Club Postres")).toBeInTheDocument())
    expect(screen.getByText(/sin movimiento/)).toBeInTheDocument()
  })

  it("sin actividad lo dice, en vez de pintar un panel en ceros", async () => {
    responder(200, { ...DATOS, totals: { ...DATOS.totals, stamps: 0, redemptions: 0, completedCycles: 0, redemptionRate: null } })
    render(<MetricasHistoricas />)
    await waitFor(() => expect(screen.getByText(/todavía no hay movimiento/i)).toBeInTheDocument())
  })

  it("un permiso que falta se nombra como permiso y no se ofrece reintentar", async () => {
    responder(403, { error: "Forbidden", code: "KF-ACCESS-001", action: "Solicita permisos a un administrador.", requestId: "req-403", retryable: false })
    render(<MetricasHistoricas />)
    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent(/no tienes acceso/i)
    expect(alerta).toHaveTextContent("Solicita permisos a un administrador.")
    expect(alerta).toHaveTextContent("req-403")
    expect(screen.queryByRole("button", { name: /reintentar/i })).toBeNull()
  })

  it("una sesión caída se distingue de un error del servidor", async () => {
    responder(401, { error: "No autorizado", code: "KF-AUTH-001", action: "Inicia sesión de nuevo.", requestId: "req-401", retryable: false })
    render(<MetricasHistoricas />)
    expect(await screen.findByText(/tu sesión terminó/i)).toBeInTheDocument()
  })

  it("un error del servidor sí ofrece reintentar y enseña su referencia", async () => {
    responder(500, { error: "Internal server error", code: "KF-SYS-001", action: "Inténtalo de nuevo más tarde.", requestId: "req-500", retryable: true })
    render(<MetricasHistoricas />)
    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent("req-500")
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeEnabled()
  })

  it("un contrato roto se dice, no se pinta como si no hubiera pasado nada", async () => {
    responder(200, { algo: "que no es el contrato" })
    render(<MetricasHistoricas />)
    expect(await screen.findByText(/no tiene la forma esperada/i)).toBeInTheDocument()
  })

  it("sin conexión no promete una referencia que no existe", async () => {
    global.fetch = vi.fn(async () => { throw new Error("offline") }) as unknown as typeof fetch
    render(<MetricasHistoricas />)
    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent(/no hay conexión/i)
    expect(alerta).not.toHaveTextContent(/Referencia:/)
  })
})
