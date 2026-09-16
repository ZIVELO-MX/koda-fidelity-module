import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { exchangeCodeForSession, findUser, provisionSignup } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  findUser: vi.fn(),
  provisionSignup: vi.fn(),
}))

vi.mock("@/lib/supabase-req-res", () => ({
  createSupabaseReqResClient: (_request: Request, response: Response) => ({
    supabase: { auth: { exchangeCodeForSession } },
    response,
  }),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: findUser } },
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
    findUser.mockResolvedValue({ id: "member-1" })
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
})
