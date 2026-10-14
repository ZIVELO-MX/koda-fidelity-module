import { beforeEach, describe, expect, it, vi } from "vitest"

const { getBusinessFromSession, prisma } = vi.hoisted(() => ({
  getBusinessFromSession: vi.fn(),
  prisma: {
    user: { findMany: vi.fn() },
    teamInvitation: { findMany: vi.fn() },
  },
}))

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return { ...actual, getBusinessFromSession }
})
vi.mock("@/lib/prisma", () => ({ prisma }))
vi.mock("@/lib/supabase-admin", () => ({ createAdminClient: vi.fn() }))
vi.mock("@/lib/invite-email", () => ({ sendSecureInviteEmail: vi.fn() }))

import { GET } from "./route"
import { UnauthorizedError } from "@/lib/api-utils"

const business = { id: "biz-auth-roles" }
const users = [{ id: "user-admin", email: "admin@dev.invalid", name: "Admin", role: "admin", createdAt: new Date() }]
const invitations: never[] = []

describe("GET /api/users authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.user.findMany.mockResolvedValue(users)
    prisma.teamInvitation.findMany.mockResolvedValue(invitations)
  })

  it("returns 401 when there is no authenticated session", async () => {
    getBusinessFromSession.mockRejectedValue(new UnauthorizedError())

    const response = await GET()

    expect(response.status).toBe(401)
    expect(prisma.user.findMany).not.toHaveBeenCalled()
  })

  it("allows an admin to list users and invitations", async () => {
    getBusinessFromSession.mockResolvedValue({ business, user: { id: "user-admin", role: "admin" } })

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      users: [{ ...users[0], createdAt: users[0].createdAt.toISOString() }],
      invitations,
    })
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { businessId: business.id } }))
  })

  it("returns 403 when a sellador tries to list users", async () => {
    getBusinessFromSession.mockResolvedValue({ business, user: { id: "user-sellador", role: "sellador" } })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.code).toBe("KF-ACCESS-001")
    expect(prisma.user.findMany).not.toHaveBeenCalled()
  })
})
