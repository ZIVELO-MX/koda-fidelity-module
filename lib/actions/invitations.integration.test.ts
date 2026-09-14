import { afterAll, afterEach, describe, expect, it, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { createInvitationToken } from "@/lib/auth-security"

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }))
vi.mock("@/lib/supabase-server", () => ({ createClient }))

import { acceptTeamInvitation } from "./invitations"

const integration = describe.skipIf(process.env.CI !== "true")

integration("team invitation acceptance", () => {
  const businessIds: string[] = []
  afterEach(async () => { await Promise.all(businessIds.splice(0).map(id => prisma.business.delete({ where: { id } }))) })
  afterAll(async () => prisma.$disconnect())

  it("accepts a valid one-use invitation and binds the member to its business", async () => {
    process.env.AUTH_SECURITY_SECRET = "fid0021-integration-secret-01234567890123456789"
    const business = await prisma.business.create({ data: { name: "Invite Business", email: `invite-${Date.now()}@test.invalid` } })
    businessIds.push(business.id)
    const inviter = await prisma.user.create({ data: { businessId: business.id, authUserId: randomUUID(), email: business.email, name: "Owner", role: "admin" } })
    const token = createInvitationToken()
    const invitation = await prisma.teamInvitation.create({ data: { businessId: business.id, invitedById: inviter.id, email: "member@test.invalid", name: "Member", role: "sellador", tokenHash: token.tokenHash, expiresAt: new Date(Date.now() + 60_000) } })
    createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: randomUUID(), email: invitation.email } } }) } })
    const form = new FormData()
    form.set("token", token.token)
    await expect(acceptTeamInvitation(form)).rejects.toMatchObject({ digest: expect.stringContaining("/dashboard/update-password") })
    expect(await prisma.teamInvitation.findUniqueOrThrow({ where: { id: invitation.id } })).toMatchObject({ status: "accepted" })
    expect(await prisma.user.findFirst({ where: { businessId: business.id, email: invitation.email } })).toMatchObject({ role: "sellador", passwordSetupRequired: true })
  })
})
