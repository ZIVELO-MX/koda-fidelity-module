import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { FinDelMesPro } from "../fin-del-mes-pro"
import type { AvisoDeFinDeMes } from "@/lib/fin-del-mes-pro"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const base: AvisoDeFinDeMes = {
  suscripcionId: "sub-1",
  terminaEl: "2026-10-03T18:00:00.000Z",
  diasRestantes: 3,
  intervalo: "ANNUAL",
  tarjetaConAcabado: null,
  seQueda: null,
  seDesactivan: [],
}
const pinta = (aviso: Partial<AvisoDeFinDeMes> = {}) =>
  render(<FinDelMesPro aviso={{ ...base, ...aviso }} negocio="Café Aurora" correo="raul@cafeaurora.mx" />)

let peticiones: { url: string; cuerpo: unknown }[]
beforeEach(() => {
  window.localStorage.clear()
  peticiones = []
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    peticiones.push({ url, cuerpo: init?.body ? JSON.parse(String(init.body)) : null })
    return new Response(JSON.stringify({
      request: { ticketNumber: "KF-0123456789ABCDEF", plan: "PRO", billingInterval: "ANNUAL", status: "PENDING", businessName: "Café Aurora", contactEmail: "raul@cafeaurora.mx" },
    }), { status: 201, headers: { "Content-Type": "application/json" } })
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe("Fin del mes Pro", () => {
  it("dice cuándo termina, con los días y la fecha", async () => {
    pinta()
    expect(await screen.findByText(/Tu mes con Pro termina en 3 días, el/)).toBeInTheDocument()
  })

  it("enseña la tarjeta con su acabado al lado de cómo quedará con Lite", async () => {
    pinta({ tarjetaConAcabado: { id: "c1", name: "Club Aurora", reward: "Un café", stampsRequired: 10, brandColor: "#f97316", themeCode: "foil" } })
    expect(await screen.findByText("Hoy, con Pro")).toBeInTheDocument()
    expect(screen.getByText("Con Lite")).toBeInTheDocument()
    expect(screen.getByText(/«Club Aurora» usa el color que elegiste/)).toBeInTheDocument()
  })

  it("nombra las tarjetas que se desactivan y la que sigue", async () => {
    pinta({ seQueda: "Club Aurora", seDesactivan: ["Sucursal Centro", "Sucursal Norte"] })
    expect(await screen.findByText(/queda activa una sola tarjeta, «Club Aurora»/)).toBeInTheDocument()
    expect(screen.getByText(/«Sucursal Centro», «Sucursal Norte» se desactivan/)).toBeInTheDocument()
  })

  it("«Continuar con Lite» lo cierra y no vuelve para esa suscripción", async () => {
    const { unmount } = pinta()
    fireEvent.click(await screen.findByRole("button", { name: "Continuar con Lite" }))
    expect(screen.queryByText(/Tu mes con Pro termina/)).toBeNull()
    unmount()
    pinta()
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByText(/Tu mes con Pro termina/)).toBeNull()
  })

  it("«Mantener Pro» pide Pro con la modalidad que ya tiene y enseña el folio", async () => {
    pinta()
    fireEvent.click(await screen.findByRole("button", { name: /Mantener Pro por \$2,990 al año/ }))
    await waitFor(() => expect(peticiones.length).toBe(1))
    expect(peticiones[0].url).toBe("/api/subscription-requests")
    expect(peticiones[0].cuerpo).toEqual({ plan: "PRO", billingInterval: "ANNUAL" })
    expect(await screen.findAllByText(/KF-0123456789ABCDEF/)).not.toHaveLength(0)
  })

  it("si falla, lo dice con su referencia en vez de quedarse callado", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "x", code: "KF-SYS-001", action: "Inténtalo de nuevo más tarde.", requestId: "req-9", retryable: true }), { status: 500, headers: { "x-request-id": "req-9" } })))
    pinta()
    fireEvent.click(await screen.findByRole("button", { name: /Mantener Pro/ }))
    expect(await screen.findByRole("alert")).toHaveTextContent("req-9")
  })
})
