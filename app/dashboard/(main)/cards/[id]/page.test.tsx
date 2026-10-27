import { describe, expect, it, vi } from "vitest"
import type { ReactElement } from "react"

const { tabla } = vi.hoisted(() => ({ tabla: vi.fn(() => null) }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    business: { findFirst: vi.fn().mockResolvedValue({ id: "biz-1" }) },
    user: { findUnique: vi.fn().mockResolvedValue({ role: "admin" }) },
    loyaltyCard: { findUnique: vi.fn().mockResolvedValue({
      id: "card-1", businessId: "biz-1", name: "Club", reward: "Café", stampsRequired: 8, brandColor: "#ff6b35", expiresAt: null,
      _count: { customers: 1 }, milestoneRewards: [], effectiveTheme: null,
      customers: [{ id: "c1", name: "Ana", stamps: 9, createdAt: new Date(), _count: { stampsLog: 0, milestoneClaims: 0 }, currentCycle: { configuration: { stampsRequired: 10 } } }],
    }) },
  },
}))
vi.mock("@/lib/supabase-server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "auth-1", email: "a@test.invalid" } } }) } }) }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@/components/dashboard/customers-table", () => ({ CustomersTable: tabla }))

import CardDetailPage from "./page"

function buscar(nodo: unknown): ReactElement<{ customers: Array<{ card: { stampsRequired: number } }>; puedeArchivar?: boolean }> | null {
  if (!nodo || typeof nodo !== "object") return null
  const elemento = nodo as ReactElement<{ children?: unknown }>
  if (elemento.type === tabla) return elemento as never
  for (const hijo of ([] as unknown[]).concat(elemento.props?.children ?? [])) {
    const encontrado = buscar(hijo)
    if (encontrado) return encontrado
  }
  return null
}

describe("detalle de tarjeta", () => {
  it("muestra a cada cliente con la meta de su ciclo y deja archivar al admin", async () => {
    const pagina = await CardDetailPage({ params: Promise.resolve({ id: "card-1" }), searchParams: Promise.resolve({}) })
    const props = buscar(pagina)!.props
    expect(props.customers[0].card.stampsRequired).toBe(10)
    expect(props.puedeArchivar).toBe(true)
  })
})
