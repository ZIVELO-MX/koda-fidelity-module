import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findUser: vi.fn(),
  findSubscription: vi.fn(),
  findPlanEvent: vi.fn(),
}))

vi.mock("@/lib/supabase-server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUser },
    subscription: { findFirst: mocks.findSubscription },
    billingAuditEvent: { findFirst: mocks.findPlanEvent },
  },
}))
vi.mock("@/components/onboarding/alta", () => ({
  Alta: ({ allowPlanSelectionWhileAwaitingActivation = false }: { allowPlanSelectionWhileAwaitingActivation?: boolean }) => (
    <div data-testid="alta" data-show-plans={String(allowPlanSelectionWhileAwaitingActivation)}>Onboarding</div>
  ),
}))
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`) } }))

import OnboardingPage from "./page"

describe("Onboarding para un negocio inactivo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-user", email: "member@test.invalid" } } })
    mocks.findSubscription.mockResolvedValue(null)
    mocks.findPlanEvent.mockResolvedValue({ action: "deactivate_plan" })
  })

  it("muestra al sellador un aviso sin la solicitud de activación", async () => {
    mocks.findUser.mockResolvedValue({
      role: "sellador",
      businessId: "business-1",
      business: { id: "business-1", name: "Café Luna" },
    })

    render(await OnboardingPage())

    expect(screen.getByRole("status")).toHaveTextContent(
      "La cuenta de Café Luna está inactiva. Pide a un administrador que la reactive.",
    )
    expect(screen.queryByTestId("alta")).not.toBeInTheDocument()
    expect(screen.queryByText(/Solicitar activación/)).not.toBeInTheDocument()
  })

  it("deja al administrador abrir el selector de planes para reactivar el negocio", async () => {
    mocks.findUser.mockResolvedValue({
      role: "admin",
      businessId: "business-1",
      business: { id: "business-1", name: "Café Luna" },
    })

    render(await OnboardingPage())

    expect(screen.getByTestId("alta")).toHaveAttribute("data-show-plans", "true")
  })
})
