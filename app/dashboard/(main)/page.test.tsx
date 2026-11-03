import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

const { stampLogs, cards } = vi.hoisted(() => ({ stampLogs: vi.fn(), cards: vi.fn() }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn().mockResolvedValue({ businessId: "biz-1" }) },
    business: { findUnique: vi.fn().mockResolvedValue({ id: "biz-1", name: "Café", nickname: null, brandColor: "#ff6b35", logoUrl: null, iconName: null }) },
    loyaltyCard: { findMany: cards },
    stampLog: { findMany: stampLogs },
    customer: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))
vi.mock("@/lib/supabase-server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "auth-1" } } }) } }) }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@/components/dashboard/metricas-historicas", () => ({ MetricasHistoricas: () => null }))
vi.mock("@/components/dashboard/actividad-paginada", () => ({ ActividadPaginada: () => null }))

import DashboardPage from "./page"

describe("inicio del panel", () => {
  it("lista como actividad solo sellos y canjes, y avisa «a un sello» con la meta del ciclo", async () => {
    stampLogs.mockResolvedValue([])
    // Meta de la tarjeta: 8. El ciclo de Ana se abrió con meta 10 y lleva 9.
    cards.mockResolvedValue([{
      id: "card-1", name: "Club", stampsRequired: 8, expiresAt: null, _count: { customers: 1 },
      customers: [{ id: "c1", name: "Ana", stamps: 9, currentCycle: { configuration: { stampsRequired: 10 } } }],
    }])

    const html = renderToStaticMarkup(await DashboardPage())

    // Un alta, una tarjeta llena o una sorpresa salían como «Canjeó su recompensa».
    expect(stampLogs.mock.calls[0][0]).toMatchObject({ where: { type: { in: ["stamp", "redeem"] } }, take: 10 })
    // Con la meta de la tarjeta, 8 - 9 no es 1 y Ana no aparecía.
    expect(html).toContain("Un cliente está a un sello de completar")
    expect(html).toContain("Ana")
  })
})
