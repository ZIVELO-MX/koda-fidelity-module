import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findUser: vi.fn(),
  findCard: vi.fn(),
  resolvePrimaryCard: vi.fn(),
  syncExpiredEntitlements: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`) }),
}))

vi.mock("@/lib/supabase-server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUser },
    loyaltyCard: { findUnique: mocks.findCard },
  },
}))
vi.mock("@/lib/account-lifecycle", () => ({
  resolvePrimaryCard: mocks.resolvePrimaryCard,
  syncExpiredEntitlements: mocks.syncExpiredEntitlements,
}))
vi.mock("@/components/dashboard/edit-card-form", () => ({
  EditCardForm: ({ cardId }: { cardId: string }) => <div data-testid="edit-card-form" data-card-id={cardId} />,
}))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))

import EditCardPage from "./page"

function card(status: "ACTIVE" | "LOCKED_BY_PLAN" | "ARCHIVED" | "DRAFT") {
  return {
    id: "card-1",
    businessId: "business-1",
    status,
    isActive: status === "ACTIVE",
    name: "Tarjeta de prueba",
    reward: "Café gratis",
    brandColor: "#123456",
    stampsRequired: 10,
    iconName: null,
    stampIconName: null,
    selectedThemeId: null,
    selectedTheme: null,
    textColor: "LIGHT",
    description: null,
    expiresAt: null,
    milestoneRewards: [],
  }
}

describe("página de edición de tarjeta", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-user", email: "admin@test.invalid" } } })
    mocks.findUser.mockResolvedValue({
      role: "admin",
      business: { id: "business-1", name: "Café Luna", logoUrl: null },
    })
    mocks.findCard.mockResolvedValue(card("LOCKED_BY_PLAN"))
    mocks.resolvePrimaryCard.mockResolvedValue({ id: "card-1", name: "Tarjeta de prueba" })
    mocks.syncExpiredEntitlements.mockResolvedValue({ plan: "LITE", subscription: { liteCardId: "card-1" } })
  })

  it("permite editar una tarjeta bloqueada por el plan", async () => {
    render(await EditCardPage({ params: Promise.resolve({ id: "card-1" }) }))

    expect(screen.getByTestId("edit-card-form")).toHaveAttribute("data-card-id", "card-1")
  })

  it.each(["ARCHIVED", "DRAFT"] as const)("redirige las tarjetas %s", async (status) => {
    mocks.findCard.mockResolvedValue(card(status))

    await expect(EditCardPage({ params: Promise.resolve({ id: "card-1" }) })).rejects.toThrow("redirect:/dashboard/cards")
  })
})
