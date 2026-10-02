import { beforeEach, describe, expect, it, vi } from "vitest"

const { getBusinessFromSession, requireWritableBusinessPrincipal, prisma, inviteUserByEmail } = vi.hoisted(() => ({
  getBusinessFromSession: vi.fn(),
  requireWritableBusinessPrincipal: vi.fn(),
  inviteUserByEmail: vi.fn(),
  prisma: {
    user: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
    teamInvitation: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}))

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return { ...actual, getBusinessFromSession, requireWritableBusinessPrincipal }
})
vi.mock("@/lib/prisma", () => ({ prisma }))
vi.mock("@/lib/supabase-admin", () => ({ createAdminClient: () => ({ auth: { admin: { inviteUserByEmail } } }) }))
vi.mock("@/lib/auth-security", async () => ({
  ...(await vi.importActual<typeof import("@/lib/auth-security")>("@/lib/auth-security")),
  enforceRateLimit: vi.fn(),
  createInvitationToken: () => ({ token: "token", tokenHash: "hash" }),
}))
vi.mock("@/lib/invite-email", () => ({ sendSecureInviteEmail: vi.fn() }))

import { GET, POST } from "./route"
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

describe("POST /api/users invitations", () => {
  const invitar = () => POST({ json: async () => ({ email: "Nuevo@Biz.test", name: "Nuevo", role: "sellador" }), headers: new Headers() } as never)

  beforeEach(() => {
    vi.clearAllMocks()
    requireWritableBusinessPrincipal.mockResolvedValue({ business: { id: "biz1", name: "Biz" }, user: { id: "user-admin", role: "admin" } })
    prisma.user.count.mockResolvedValue(1)
    prisma.teamInvitation.count.mockResolvedValue(0)
    prisma.user.findUnique.mockResolvedValue(null)
    prisma.teamInvitation.create.mockResolvedValue({ id: "inv-new" })
    inviteUserByEmail.mockResolvedValue({ data: { user: null }, error: null })
  })

  // Antes solo contaban los miembros: se mandaban más invitaciones que plazas.
  it("counts pending invitations toward the team limit", async () => {
    prisma.user.count.mockResolvedValue(2)
    prisma.teamInvitation.count.mockResolvedValue(1)
    const response = await invitar()
    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain("invitaciones pendientes")
    expect(prisma.teamInvitation.create).not.toHaveBeenCalled()
  })

  it("marks the invitation delivery_failed when the email cannot be sent", async () => {
    inviteUserByEmail.mockRejectedValue(new Error("smtp down"))
    const response = await invitar()
    expect(response.status).toBe(500)
    expect(prisma.teamInvitation.update).toHaveBeenCalledWith({ where: { id: "inv-new" }, data: { status: "delivery_failed" } })
  })

  it("replaces the previous pending invitation for the same email once sent", async () => {
    const response = await invitar()
    expect(response.status).toBe(202)
    expect(prisma.teamInvitation.updateMany).toHaveBeenCalledWith({
      where: { businessId: "biz1", email: "nuevo@biz.test", status: "pending", id: { not: "inv-new" } },
      data: { status: "replaced" },
    })
  })
})
