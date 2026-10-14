import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/supabase-server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}))

import { cuerpoJson, handleApiError } from "../api-utils"

/**
 * Un cuerpo mal formado es un error del cliente y no se arregla reintentando.
 *
 * Catorce rutas hacían `await request.json()` dentro del try. El SyntaxError que
 * lanza el parser no es ninguna de las clases que `handleApiError` reconoce, así
 * que caía en la rama de descarte: 500, `KF-SYS-001`, «Internal server error» y
 * `retryable: true`, más un registro «API Error» que solo lleva el requestId y
 * el nombre del error. El cliente reintenta algo que nunca va a funcionar y el
 * registro no dice ni qué ruta fue.
 */
const malFormado = () => new Request("https://koda.test/api/x", { method: "POST", body: "{ esto no es json" })

describe("cuerpo mal formado", () => {
  it("lo que pasaba antes: el parser crudo cae en la rama de descarte", async () => {
    let capturado: unknown
    try {
      await malFormado().json()
    } catch (error) {
      capturado = error
    }
    expect(capturado).toBeInstanceOf(SyntaxError)

    const respuesta = handleApiError(capturado, "req-1")
    expect(respuesta.status).toBe(500)
    const cuerpo = await respuesta.json()
    expect(cuerpo.code).toBe("KF-SYS-001")
    expect(cuerpo.retryable).toBe(true)
  })

  it("con cuerpoJson es un 400 que no invita a reintentar", async () => {
    let capturado: unknown
    try {
      await cuerpoJson(malFormado())
    } catch (error) {
      capturado = error
    }

    const respuesta = handleApiError(capturado, "req-2")
    expect(respuesta.status).toBe(400)
    const cuerpo = await respuesta.json()
    expect(cuerpo.code).toBe("KF-REQUEST-001")
    expect(cuerpo.retryable).toBe(false)
    expect(cuerpo.action).toBe("Corrige los datos enviados.")
  })

  it("un cuerpo válido pasa tal cual", async () => {
    const peticion = new Request("https://koda.test/api/x", { method: "POST", body: JSON.stringify({ a: 1 }) })
    expect(await cuerpoJson(peticion)).toEqual({ a: 1 })
  })

  it("no toca los SyntaxError que no vienen del cuerpo", () => {
    // La clave de servicio de Google se lee con JSON.parse. Si estuviera mal,
    // es un fallo del servidor y tiene que seguir siendo 500: decirle al
    // usuario que corrija sus datos sería mentirle.
    const respuesta = handleApiError(new SyntaxError("Unexpected token in service account key"), "req-3")
    expect(respuesta.status).toBe(500)
  })
})
