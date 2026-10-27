import { beforeEach, describe, expect, it, vi } from "vitest"

const { getAccountPrincipal, prisma } = vi.hoisted(() => ({
  getAccountPrincipal: vi.fn(),
  prisma: { customerProfile: { findUnique: vi.fn(), update: vi.fn() } },
}))
vi.mock("@/lib/api-utils", async () => ({ ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")), getAccountPrincipal }))
vi.mock("@/lib/prisma", () => ({ prisma }))
vi.mock("@/lib/private-avatar", () => ({ withCustomerAvatarUrl: async (profile: unknown) => profile }))

import { PATCH } from "./route"

const patch = (body: unknown) => PATCH({ json: async () => body, headers: new Headers() } as never)

describe("PATCH /api/customer-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAccountPrincipal.mockResolvedValue({ id: "auth-1", email: "ana@test.invalid" })
  })

  // Antes `update` lanzaba P2025 y se respondía 500.
  it("answers 404 when the customer has no profile yet", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue(null)
    expect((await patch({ avatarRingColor: "#112233" })).status).toBe(404)
    expect(prisma.customerProfile.update).not.toHaveBeenCalled()
  })

  it("rejects an empty name, as PUT does", async () => {
    expect((await patch({ name: "   " })).status).toBe(400)
    expect(prisma.customerProfile.update).not.toHaveBeenCalled()
  })
})
