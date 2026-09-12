import { afterAll, afterEach, describe, expect, it, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/prisma"

const { getBusinessFromSession } = vi.hoisted(() => ({ getBusinessFromSession: vi.fn() }))
vi.mock("@/lib/api-utils", async () => ({ ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")), getBusinessFromSession }))

import { DELETE } from "./route"

const integration = describe.skipIf(process.env.CI !== "true")

integration("DELETE /api/users/:id tenant and role contract", () => {
  const businessIds: string[] = []
  afterEach(async () => { await Promise.all(businessIds.splice(0).map(id => prisma.business.delete({ where: { id } }))) })
  afterAll(async () => prisma.$disconnect())

  it("deletes a member in the current business", async () => {
    const business = await prisma.business.create({ data: { name: "User API", email: `user-api-${Date.now()}@test.invalid` } })
    businessIds.push(business.id)
    const admin = await prisma.user.create({ data: { businessId: business.id, authUserId: randomUUID(), email: business.email, name: "Admin", role: "admin" } })
    const member = await prisma.user.create({ data: { businessId: business.id, authUserId: randomUUID(), email: `member-${Date.now()}@test.invalid`, name: "Member", role: "sellador" } })
    getBusinessFromSession.mockResolvedValue({ business, user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role, passwordSetupRequired: false } })
    const response = await DELETE(new Request("http://localhost/api/users/member", { headers: { "x-request-id": "delete-1" } }) as never, { params: Promise.resolve({ id: member.id }) })
    expect(response.status).toBe(200)
    expect(await prisma.user.findUnique({ where: { id: member.id } })).toBeNull()
  })

  it("does not delete a member belonging to another business", async () => {
    const [first, second] = await Promise.all([
      prisma.business.create({ data: { name: "User A", email: `user-a-${Date.now()}@test.invalid` } }),
      prisma.business.create({ data: { name: "User B", email: `user-b-${Date.now()}@test.invalid` } }),
    ])
    businessIds.push(first.id, second.id)
    const admin = await prisma.user.create({ data: { businessId: first.id, authUserId: randomUUID(), email: first.email, name: "Admin", role: "admin" } })
    const member = await prisma.user.create({ data: { businessId: second.id, authUserId: randomUUID(), email: `member-b-${Date.now()}@test.invalid`, name: "Member", role: "sellador" } })
    getBusinessFromSession.mockResolvedValue({ business: first, user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role, passwordSetupRequired: false } })
    const response = await DELETE(new Request("http://localhost/api/users/member") as never, { params: Promise.resolve({ id: member.id }) })
    expect(response.status).toBe(404)
    expect(await prisma.user.findUnique({ where: { id: member.id } })).not.toBeNull()
  })
})
