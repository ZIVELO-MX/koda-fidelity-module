import { describe, expect, it, vi } from "vitest"

const { tx, redirect } = vi.hoisted(() => ({
  redirect: vi.fn((destino: string) => { throw new Error(`REDIRECT ${destino}`) }),
  tx: {
    teamInvitation: { findUnique: vi.fn(), update: vi.fn() },
    accountClosure: { findFirst: vi.fn() },
    user: { count: vi.fn().mockResolvedValue(1), create: vi.fn() },
    $executeRaw: vi.fn(),
  },
}))
vi.mock("next/navigation", () => ({ redirect }))
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } }))
vi.mock("@/lib/supabase-server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "auth-1", email: "nuevo@test.invalid" } } }) } }) }))
vi.mock("@/lib/auth-security", () => ({ invitationTokenHash: () => "hash", normalizeEmail: (correo: string) => correo.trim().toLowerCase() }))

import { acceptTeamInvitation } from "./invitations"

// Con el cierre programado el negocio es de solo lectura. Aceptar creaba un
// miembro igual, y al ejecutarse el cierre se le borraba la cuenta sin aviso.
describe("acceptTeamInvitation", () => {
  it("no suma miembros a un negocio con el cierre programado", async () => {
    tx.teamInvitation.findUnique.mockResolvedValue({ id: "inv-1", businessId: "biz-1", email: "nuevo@test.invalid", name: "Nuevo", role: "sellador", status: "pending", expiresAt: new Date(Date.now() + 86_400_000) })
    tx.accountClosure.findFirst.mockResolvedValue({ id: "cierre" })
    const datos = new FormData()
    datos.set("token", "nonce.firma")

    await expect(acceptTeamInvitation(datos)).rejects.toThrow("REDIRECT /invite?token=nonce.firma&aviso=cuenta-en-cierre")
    expect(tx.user.create).not.toHaveBeenCalled()
  })
})
