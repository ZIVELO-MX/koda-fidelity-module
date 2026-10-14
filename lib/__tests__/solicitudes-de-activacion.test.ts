import { describe, it, expect, vi, afterEach } from "vitest"
import {
  asuntoDelCorreo, cuerpoDelCorreo, enlaceDeCorreo, leerSolicitud,
  solicitarActivacion, solicitudVigente, SOPORTE,
} from "../solicitudes-de-activacion"

// La forma real que devuelve el PR #135: envuelta en `request`, y el folio se
// llama `ticketNumber`.
const RESPUESTA = {
  request: {
    ticketNumber: "KF-2026-0042",
    plan: "PRO",
    billingInterval: "MONTHLY",
    status: "PENDING",
    businessName: "Café Aurora",
    contactEmail: "raul@cafeaurora.mx",
    createdAt: "2026-09-23T12:00:00.000Z",
  },
}

function servidor(estado: number, cuerpo: unknown, requestId = "req-sol-1") {
  const llamadas: { url: string; metodo: string; cuerpo?: unknown }[] = []
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    llamadas.push({
      url, metodo: init?.method ?? "GET",
      cuerpo: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    })
    return {
      ok: estado >= 200 && estado < 300,
      status: estado,
      headers: { get: (n: string) => (n === "x-request-id" ? requestId : null) },
      json: async () => cuerpo,
    }
  }) as unknown as typeof fetch
  return llamadas
}

afterEach(() => vi.restoreAllMocks())

describe("leerSolicitud", () => {
  it("lee el contrato real: envuelto en request, con ticketNumber por folio", () => {
    const s = leerSolicitud(RESPUESTA)
    expect(s).toEqual({
      folio: "KF-2026-0042",
      plan: "PRO",
      intervalo: "MONTHLY",
      estado: "PENDING",
      negocio: "Café Aurora",
      correo: "raul@cafeaurora.mx",
    })
  })

  it("distingue una solicitud ya atendida", () => {
    const s = leerSolicitud({ request: { ...RESPUESTA.request, status: "COMPLETED" } })
    expect(s?.estado).toBe("COMPLETED")
  })

  it("sin solicitud o sin folio devuelve null en vez de inventar uno", () => {
    expect(leerSolicitud({ request: null })).toBeNull()
    expect(leerSolicitud({ request: { plan: "LITE" } })).toBeNull()
    expect(leerSolicitud({ request: { ticketNumber: "   " } })).toBeNull()
    expect(leerSolicitud(null)).toBeNull()
  })
})

describe("solicitarActivacion", () => {
  it("manda solo plan y modalidad: el negocio sale de la sesión", async () => {
    const llamadas = servidor(201, RESPUESTA)
    const r = await solicitarActivacion("PRO", "ANNUAL")
    expect(r.ok).toBe(true)
    expect(llamadas[0].url).toBe("/api/subscription-requests")
    expect(llamadas[0].metodo).toBe("POST")
    // Ni businessId ni customerId: el cliente no elige de quién es la solicitud.
    expect(llamadas[0].cuerpo).toEqual({ plan: "PRO", billingInterval: "ANNUAL" })
  })

  it("un 201 sin folio se trata como fallo, no como éxito mudo", async () => {
    servidor(201, { request: null })
    const r = await solicitarActivacion("LITE", "MONTHLY")
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.fallo.titulo).toMatch(/no llegó su folio/i)
      expect(r.fallo.reintentable).toBe(true)
    }
  })

  it("sin el endpoint todavía desplegado lo dice, y no ofrece reintentar en bucle", async () => {
    servidor(404, null)
    const r = await solicitarActivacion("LITE", "ANNUAL")
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.fallo.detalle).toContain(SOPORTE)
      expect(r.fallo.reintentable).toBe(false)
    }
  })

  it("un error del servidor es recuperable y trae su referencia", async () => {
    servidor(500, { error: "Internal server error", code: "KF-SYS-001", requestId: "req-500", retryable: true })
    const r = await solicitarActivacion("LITE", "ANNUAL")
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.fallo.reintentable).toBe(true)
      expect(r.fallo.requestId).toBe("req-500")
    }
  })

  it("un 409 dice que ya fue atendida, no que la petición estaba mal", async () => {
    servidor(409, { error: "La solicitud ya fue activada; contacta a soporte para cambiar el plan", code: "KF-REQUEST-001", requestId: "req-409", retryable: true })
    const r = await solicitarActivacion("PRO", "ANNUAL")
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.fallo.titulo).toMatch(/ya fue atendida/i)
      expect(r.fallo.reintentable).toBe(false)
      expect(r.fallo.accion).toContain(SOPORTE)
    }
  })

  it("sin conexión no promete una referencia que no existe", async () => {
    global.fetch = vi.fn(async () => { throw new Error("offline") }) as unknown as typeof fetch
    const r = await solicitarActivacion("LITE", "ANNUAL")
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.fallo.requestId).toBeUndefined()
  })
})

describe("solicitudVigente", () => {
  it("recupera la solicitud pendiente al recargar", async () => {
    const llamadas = servidor(200, RESPUESTA)
    const r = await solicitudVigente()
    expect(llamadas[0].metodo).toBe("GET")
    expect(r.ok && r.solicitud?.folio).toBe("KF-2026-0042")
  })

  it("sin solicitud pendiente devuelve null sin fallar", async () => {
    servidor(200, { request: null })
    const r = await solicitudVigente()
    expect(r.ok).toBe(true)
    expect(r.ok && r.solicitud).toBeNull()
  })
})

describe("el correo a soporte", () => {
  const datos = { folio: "KF-2026-0042", negocio: "Café Aurora", correo: "raul@cafeaurora.mx", plan: "LITE" as const, intervalo: "ANNUAL" as const }

  it("lleva lo que soporte necesita para encontrar la cuenta", () => {
    const cuerpo = cuerpoDelCorreo(datos)
    for (const dato of ["KF-2026-0042", "Café Aurora", "raul@cafeaurora.mx", "Lite", "anual"]) {
      expect(cuerpo, dato).toContain(dato)
    }
    expect(asuntoDelCorreo(datos)).toContain("KF-2026-0042")
  })

  it("lo que no se sabe se dice, no se rellena con vacío", () => {
    const cuerpo = cuerpoDelCorreo({ ...datos, negocio: null, correo: null })
    expect(cuerpo).toContain("(sin nombre)")
    expect(cuerpo).toContain("(sin correo)")
    expect(cuerpo).not.toMatch(/Negocio: *\n/)
  })

  it("el enlace va a soporte y lleva asunto y cuerpo codificados", () => {
    const enlace = enlaceDeCorreo(datos)
    expect(enlace.startsWith(`mailto:${SOPORTE}?`)).toBe(true)
    expect(enlace).toContain(encodeURIComponent("KF-2026-0042"))
    expect(enlace).not.toContain("\n")
  })
})
