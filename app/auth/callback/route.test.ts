import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { exchangeCodeForSession, getUser, findUser, findCustomer, provisionSignup } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  findUser: vi.fn(),
  findCustomer: vi.fn(),
  provisionSignup: vi.fn(),
}))

vi.mock("@/lib/supabase-req-res", () => ({
  createSupabaseReqResClient: (_request: Request, response: Response) => ({
    supabase: { auth: { exchangeCodeForSession, getUser } },
    response,
  }),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: findUser }, customerProfile: { findUnique: findCustomer } },
}))
vi.mock("@/lib/signup-provisioning", () => ({ provisionSignup }))

import { GET } from "./route"

describe("auth callback destination", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { user: { id: "auth-user-1" } } },
      error: null,
    })
    findUser.mockResolvedValue({ id: "member-1", businessId: "business-1", onboardingProgress: { status: "ACTIVE" } })
    findCustomer.mockResolvedValue(null)
  })

  it("preserves a validated recovery destination including its query", async () => {
    const next = encodeURIComponent("/dashboard/update-password?reason=recovery")
    const response = await GET(
      new NextRequest(`http://localhost/auth/callback?code=valid-code&next=${next}`),
    )

    expect(response.headers.get("location")).toBe(
      "http://localhost/dashboard/update-password?reason=recovery",
    )
  })

  it("sends a business member to the dashboard when next is absent", async () => {
    const response = await GET(
      new NextRequest("http://localhost/auth/callback?code=valid-code"),
    )

    expect(response.headers.get("location")).toBe("http://localhost/dashboard")
  })

  // Un invitado no tiene progreso de alta; como en el layout del panel, eso no
  // es un alta pendiente. Antes caía en /onboarding.
  it("sends an invited member without signup progress to the dashboard", async () => {
    findUser.mockResolvedValue({ id: "member-2", businessId: "business-1", onboardingProgress: null })
    const response = await GET(new NextRequest("http://localhost/auth/callback?code=valid-code"))
    expect(response.headers.get("location")).toBe("http://localhost/dashboard")
  })

  it("sends a new signup without a business to onboarding", async () => {
    findUser.mockResolvedValue({ id: "member-3", businessId: null, onboardingProgress: { status: "IN_PROGRESS" } })
    const response = await GET(new NextRequest("http://localhost/auth/callback?code=valid-code"))
    expect(response.headers.get("location")).toBe("http://localhost/onboarding")
  })

  it("sends a customer profile to the customer portal", async () => {
    findUser.mockResolvedValue(null)
    findCustomer.mockResolvedValue({ id: "customer-1" })
    const response = await GET(new NextRequest("http://localhost/auth/callback?code=valid-code"))
    expect(response.headers.get("location")).toBe("http://localhost/dashboard/my-cards")
  })

  it("returns a customer to the QR card after email confirmation", async () => {
    findUser.mockResolvedValue(null)
    findCustomer.mockResolvedValue({ id: "customer-1" })
    const response = await GET(new NextRequest(
      "http://localhost/auth/callback?code=valid-code&next=%2Fjoin%2Fcard-123",
    ))

    expect(response.headers.get("location")).toBe("http://localhost/join/card-123")
  })

  // La plantilla de confirmación con token_hash pasa antes por /auth/confirm,
  // que ya abre la sesión, y llega aquí sin `code`. Antes eso era un error.
  it("sends a session without code to its validated destination", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user-1" } } })
    const response = await GET(new NextRequest(`http://localhost/auth/callback?next=${encodeURIComponent("/join/card-1")}`))
    expect(response.headers.get("location")).toBe("http://localhost/join/card-1")
  })

  it("keeps the error when there is neither code nor session", async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const response = await GET(new NextRequest(`http://localhost/auth/callback?next=${encodeURIComponent("/join/card-1")}`))
    expect(response.headers.get("location")).toContain("/auth/error")
  })
})
