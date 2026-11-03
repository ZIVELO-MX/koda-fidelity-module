import { beforeEach, describe, expect, it, vi } from "vitest"

const { signIn, getUser, memberFind, customerFind, rateLimit, redirect } = vi.hoisted(() => ({
  signIn: vi.fn(),
  getUser: vi.fn(),
  memberFind: vi.fn(),
  customerFind: vi.fn(),
  rateLimit: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("@/lib/auth-service", () => ({ authService: { signIn } }))
vi.mock("@/lib/config", () => ({ config: { isDebugEmail: () => false } }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: memberFind },
    customerProfile: { findUnique: customerFind },
  },
}))
vi.mock("@/lib/supabase-server", () => ({ createClient: async () => ({ auth: { getUser } }) }))
vi.mock("@/lib/supabase-admin", () => ({ createAdminClient: vi.fn() }))
vi.mock("@/lib/auth-security", () => ({
  enforceRateLimit: rateLimit,
  normalizeEmail: (email: string) => email.toLowerCase(),
}))
vi.mock("@/lib/api-utils", () => ({
  RateLimitError: class RateLimitError extends Error {},
  safeNextPath: (path: string, fallback: string) => path.startsWith("/") && !path.startsWith("//") ? path : fallback,
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/navigation", () => ({ redirect }))

import { login } from "./auth"

describe("login destination for a QR customer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn.mockResolvedValue(undefined)
    getUser.mockResolvedValue({ data: { user: { id: "auth-user-1" } } })
    memberFind.mockResolvedValue(null)
    customerFind.mockResolvedValue(null)
    rateLimit.mockResolvedValue(undefined)
  })

  it("returns to the requested card even before a customer profile exists", async () => {
    const formData = new FormData()
    formData.set("email", "cliente@example.com")
    formData.set("password", "correct horse battery staple")
    formData.set("next", "/join/card-123")

    await login({}, formData)

    expect(redirect).toHaveBeenCalledWith("/join/card-123")
  })
})
