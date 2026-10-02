import { beforeEach, describe, expect, it, vi } from "vitest"

const { requireWritableBusinessPrincipal, update } = vi.hoisted(() => ({ requireWritableBusinessPrincipal: vi.fn(), update: vi.fn() }))
vi.mock("@/lib/api-utils", async () => ({ ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")), requireWritableBusinessPrincipal }))
vi.mock("@/lib/prisma", () => ({ prisma: { business: { update } } }))
vi.mock("@/lib/private-avatar", () => ({ withBusinessAvatarUrl: async (_db: unknown, business: unknown) => business }))

import { PUT } from "./route"

const guardar = (body: unknown) => PUT({ json: async () => body, headers: new Headers() } as never)

// El color y el logo se pintan en la tarjeta pública: antes se guardaba cualquier texto.
describe("PUT /api/business", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireWritableBusinessPrincipal.mockResolvedValue({ business: { id: "biz1" }, user: { id: "u1", role: "admin" } })
    update.mockResolvedValue({ id: "biz1" })
  })

  it.each([
    ["a color that is not #rrggbb", { brandColor: "red" }],
    ["a logo that is not an image", { logoUrl: "javascript:alert(1)" }],
    ["a logo over 2 MB", { logoUrl: `data:image/png;base64,${"A".repeat(3_000_000)}` }],
    ["a text field that is not text", { nickname: 42 }],
  ])("rejects %s", async (_caso, body) => {
    expect((await guardar(body)).status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  it("saves a valid color and a logo uploaded from the panel", async () => {
    const logoUrl = "data:image/png;base64,iVBORw0KGgo="
    expect((await guardar({ brandColor: "#F97316", logoUrl })).status).toBe(200)
    expect(update).toHaveBeenCalledWith({ where: { id: "biz1" }, data: { brandColor: "#F97316", logoUrl } })
  })

  it("still lets the logo be removed", async () => {
    expect((await guardar({ logoUrl: null })).status).toBe(200)
  })
})
