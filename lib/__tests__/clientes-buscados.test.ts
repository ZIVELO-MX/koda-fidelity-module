import { describe, expect, it } from "vitest"
import { clienteEscaneado, normalizarClientes, parseClientesResponse } from "../clientes-buscados"

const customer = { id: "c1", name: "Ana", stamps: 3, goal: 10, maxStamps: 10, cardName: "Café", cardReward: "Un café", cardBrandColor: "#f97316", cardExpiresAt: null }

describe("customer response contract", () => {
  it("normalizes the canonical C1 items/goal shape", () => {
    expect(normalizarClientes({ items: [customer], page: 1, pageSize: 20, total: 1 })).toEqual([{ id: "c1", name: "Ana", stamps: 3, maxStamps: 10, cardName: "Café", cardReward: "Un café", cardBrandColor: "#f97316", cardExpiresAt: null }])
  })
  it("preserves pagination metadata", () => {
    expect(parseClientesResponse({ items: [customer], page: 2, pageSize: 20, total: 41 })).toMatchObject({ page: 2, pageSize: 20, total: 41 })
  })
  it("rejects HTTP errors and malformed items instead of returning an empty list", () => {
    expect(() => normalizarClientes({ error: "bad", code: "KF-REQUEST-001" })).toThrow("bad")
    expect(() => normalizarClientes({ items: [{ name: "missing id" }] })).toThrow("item id")
    expect(() => normalizarClientes({})).toThrow("items is required")
  })
})

// El escáner tomaba la meta actual de la tarjeta. El motor canjea con la del
// ciclo en curso, como la búsqueda: si la meta cambió a mitad del ciclo, el
// escáner ofrecía canjear o sellar al revés de lo que el servidor permite.
describe("clienteEscaneado", () => {
  const card = { name: "Club", reward: "Café", stampsRequired: 8, brandColor: "#ff6b35", expiresAt: null }

  it("usa la meta, el saldo y la recompensa del ciclo en curso", () => {
    expect(clienteEscaneado({ id: "c1", name: "Ana", stamps: 8, card, currentCycle: { balance: 8, configuration: { stampsRequired: 10, reward: "Pan" } } }))
      .toMatchObject({ stamps: 8, maxStamps: 10, cardReward: "Pan" })
  })

  it("sin ciclo usa la tarjeta", () => {
    expect(clienteEscaneado({ id: "c1", name: "Ana", stamps: 3, card, currentCycle: null }))
      .toMatchObject({ stamps: 3, maxStamps: 8, cardReward: "Café" })
  })
})
