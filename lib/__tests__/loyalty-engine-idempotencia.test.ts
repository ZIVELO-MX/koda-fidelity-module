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
