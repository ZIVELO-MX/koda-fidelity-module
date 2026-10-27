// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { customerProfile: { findUnique: vi.fn().mockResolvedValue({ id: "profile-1" }) } } }))
vi.mock("@/lib/supabase-admin", () => ({ createAdminClient: () => ({ storage: { from: () => ({ upload }) } }) }))
vi.mock("@/lib/api-utils", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")),
  getAccountPrincipal: vi.fn().mockResolvedValue({ id: "auth-1" }),
}))
vi.mock("@/lib/account-lifecycle", () => ({ cleanupPendingCustomerAvatars: vi.fn(), replaceCustomerAvatar: vi.fn() }))

import { PUT } from "./route"

// El tipo lo declara el cliente. Un archivo que dice ser PNG y no lo es hacía
// que sharp lanzara, y la ruta respondía 500.
describe("PUT /api/customer/profile/avatar", () => {
  it("rechaza con 400 un archivo que no es una imagen", async () => {
    const datos = new FormData()
    datos.set("file", new File([new TextEncoder().encode("esto no es una imagen")], "foto.png", { type: "image/png" }))
    const response = await PUT(new Request("http://localhost/api/customer/profile/avatar", { method: "PUT", body: datos }) as NextRequest)
    expect(response.status).toBe(400)
    expect(upload).not.toHaveBeenCalled()
  })
})
