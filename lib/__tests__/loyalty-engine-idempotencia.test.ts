import { describe, it, expect, vi } from "vitest"
import { executeLoyaltyOperation } from "@/lib/loyalty-engine"
import { ValidationError } from "@/lib/api-utils"

// Una clave ya usada devuelve la respuesta guardada solo si es la misma
// operación: mismo cliente y mismo tipo.
function dbCon(guardada: { customerId: string; type: string; response: unknown }) {
  const tx = { loyaltyOperation: { findUnique: vi.fn().mockResolvedValue(guardada) } }
  return { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } as never
}

const entrada = { businessId: "biz1", customerId: "cust1", type: "stamp" as const, idempotencyKey: "k1" }

describe("Idempotency-Key repetida", () => {
  it("devuelve la respuesta guardada si es la misma operación", async () => {
    const db = dbCon({ customerId: "cust1", type: "stamp", response: { operationId: "op1" } })
    await expect(executeLoyaltyOperation(db, entrada)).resolves.toEqual({ operationId: "op1" })
  })

  it("rechaza la clave si se usó con otro cliente", async () => {
    const db = dbCon({ customerId: "cust2", type: "stamp", response: { operationId: "op1" } })
    await expect(executeLoyaltyOperation(db, entrada)).rejects.toBeInstanceOf(ValidationError)
  })

  it("rechaza la clave si se usó para otro tipo de operación", async () => {
    const db = dbCon({ customerId: "cust1", type: "redeem", response: { operationId: "op1" } })
    await expect(executeLoyaltyOperation(db, entrada)).rejects.toBeInstanceOf(ValidationError)
  })
})

// El escáner muestra el mensaje del motor tal cual, y salía en inglés.
describe("mensajes que ve quien sella", () => {
  function dbConCliente(balance: number, stampsRequired: number, expiresAt: Date | null = null) {
    const configuration = { id: "conf1", version: 1, stampsRequired, reward: "Café", milestones: [] }
    const tx = {
      loyaltyOperation: { findUnique: vi.fn().mockResolvedValue(null) },
      customer: { findUnique: vi.fn().mockResolvedValue({
        id: "cust1", name: "Ana", isActive: true, stamps: balance,
        card: { id: "card1", businessId: "biz1", status: "ACTIVE", expiresAt, stampsRequired, reward: "Café", milestoneRewards: [] },
        currentCycle: { id: "cycle1", balance, configuration },
      }) },
    }
    return { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } as never
  }

  it("pide canjear cuando la tarjeta está completa", async () => {
    await expect(executeLoyaltyOperation(dbConCliente(10, 10), entrada)).rejects.toThrow("El cliente completó la tarjeta. Canjea la recompensa antes de sellar de nuevo.")
  })

  it("dice cuántos sellos faltan para canjear", async () => {
    await expect(executeLoyaltyOperation(dbConCliente(7, 10), { ...entrada, type: "redeem" })).rejects.toThrow("Faltan 3 sellos para poder canjear.")
  })

  it("avisa que la tarjeta venció", async () => {
    await expect(executeLoyaltyOperation(dbConCliente(1, 10, new Date("2020-01-01T00:00:00Z")), entrada)).rejects.toThrow("Esta tarjeta ya venció.")
  })
})
