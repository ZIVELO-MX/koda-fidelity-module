import { describe, expect, it } from "vitest"
import { normalizarClientes, parseClientesResponse } from "../clientes-buscados"

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
