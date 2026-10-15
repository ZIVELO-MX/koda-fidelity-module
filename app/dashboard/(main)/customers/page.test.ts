import { describe, expect, it, vi } from "vitest"
import type { ReactElement } from "react"

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    business: { findFirst: vi.fn().mockResolvedValue({ id: "business-1" }) },
    loyaltyCard: { findMany: vi.fn().mockResolvedValue([]) },
    customer: { findMany },
  },
}))
vi.mock("@/lib/supabase-server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "auth-1", email: "a@test.invalid" } } }) } }) }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@/components/dashboard/customers-table", () => ({ CustomersTable: () => null }))

import CustomersPage from "./page"
import { CustomersTable } from "@/components/dashboard/customers-table"

function tabla(nodo: unknown): ReactElement<{ customers: Array<{ id: string; card: { stampsRequired: number } }> }> | null {
  if (!nodo || typeof nodo !== "object") return null
  const elemento = nodo as ReactElement<{ children?: unknown }>
  if (elemento.type === CustomersTable) return elemento as never
  const hijos = ([] as unknown[]).concat(elemento.props?.children ?? [])
  for (const hijo of hijos) {
    const encontrado = tabla(hijo)
    if (encontrado) return encontrado
  }
  return null
}

// El motor canjea con la meta del ciclo en curso. La página usaba la meta actual
// de la tarjeta, y si cambió a mitad del ciclo marcaba «listo» a quien el
// servidor no deja canjear.
describe("CustomersPage", () => {
  it("decide quién está listo con la meta del ciclo en curso", async () => {
    findMany.mockResolvedValue([
      { id: "ciclo-de-10", stamps: 8, card: { name: "Club", stampsRequired: 8 }, currentCycle: { configuration: { stampsRequired: 10 } } },
      { id: "sin-ciclo", stamps: 8, card: { name: "Club", stampsRequired: 8 }, currentCycle: null },
    ])
    const pagina = await CustomersPage({ searchParams: Promise.resolve({ listos: "1" }) })
    const clientes = tabla(pagina)!.props.customers
    expect(clientes.map((c) => [c.id, c.card.stampsRequired])).toEqual([["sin-ciclo", 8]])
  })
})
