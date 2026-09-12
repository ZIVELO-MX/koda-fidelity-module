import { describe, it, expect } from "vitest"
import { normalizarClientes } from "../clientes-buscados"

const VIEJO = {
  customers: [
    { id: "c1", name: "Ana", stamps: 3, maxStamps: 10, cardName: "Café", cardReward: "Un café", cardBrandColor: "#f97316", cardExpiresAt: null },
  ],
}

const NUEVO = {
  items: [
    { id: "c1", name: "Ana", stamps: 3, goal: 10, cardId: "t1", cardName: "Café", cardReward: "Un café", cardBrandColor: "#f97316", cardExpiresAt: null, cardIsActive: true, readyToRedeem: false },
  ],
  page: 1,
  pageSize: 20,
  total: 1,
}

describe("normalizarClientes", () => {
  it("entiende la forma de esta rama", () => {
    expect(normalizarClientes(VIEJO)).toEqual([
      { id: "c1", name: "Ana", stamps: 3, maxStamps: 10, cardName: "Café", cardReward: "Un café", cardBrandColor: "#f97316", cardExpiresAt: null },
    ])
  })

  it("entiende la forma del backend 1.2.0, con items y goal", () => {
    // Es la regresión de verdad: leer `customers` contra ese cuerpo devolvía
    // undefined y la búsqueda del escáner se quedaba vacía sin dar error.
    expect(normalizarClientes(NUEVO)).toEqual(normalizarClientes(VIEJO))
  })

  it("no revienta con un cuerpo de error o vacío", () => {
    expect(normalizarClientes({ error: "Parámetros inválidos", code: "KF-REQUEST-001" })).toEqual([])
    expect(normalizarClientes(null)).toEqual([])
    expect(normalizarClientes(undefined)).toEqual([])
    expect(normalizarClientes({ items: [null, { name: "sin id" }] })).toEqual([])
  })
})
