import { describe, expect, it, vi } from "vitest"

const { findUnique, findMany, listUsers, getUserById } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  listUsers: vi.fn(),
  getUserById: vi.fn(),
}))
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique, findMany } } }))
vi.mock("@/lib/supabase-server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "auth-admin", email: "admin@test.invalid" } } }) } }) }))
vi.mock("@/lib/supabase-admin", () => ({ createAdminClient: () => ({ auth: { admin: { listUsers, getUserById } } }) }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("./team-client", () => ({ TeamClient: () => null }))

import TeamPage from "./page"

// `listUsers({ perPage: 100 })` leía solo la primera página de Auth, que
// incluye a los clientes de toda la plataforma: con más de 100 cuentas, quien
// ya había entrado salía como invitación pendiente.
describe("TeamPage", () => {
  it("lee el último acceso de cada miembro por su cuenta de Auth", async () => {
    findUnique.mockResolvedValue({ id: "u1", name: "Ana", role: "admin", businessId: "b1", business: { name: "Café" } })
    findMany.mockResolvedValue([
      { id: "u1", email: "admin@test.invalid", authUserId: "auth-admin", name: "Ana", role: "admin", createdAt: new Date() },
      { id: "u2", email: "sel@test.invalid", authUserId: "auth-sel", name: "Beto", role: "sellador", createdAt: new Date() },
      { id: "u3", email: "nuevo@test.invalid", authUserId: null, name: "Caro", role: "sellador", createdAt: new Date() },
    ])
    listUsers.mockResolvedValue({ data: { users: [] } })
    getUserById.mockImplementation(async (id: string) => ({ data: { user: { id, last_sign_in_at: id === "auth-sel" ? "2026-10-01T00:00:00Z" : null } } }))

    const page = await TeamPage()

    const users = (page as { props: { initialUsers: Array<{ id: string; hasLoggedIn: boolean }> } }).props.initialUsers
    expect(users.map(({ id, hasLoggedIn }) => [id, hasLoggedIn])).toEqual([["u1", false], ["u2", true], ["u3", false]])
    expect(getUserById).not.toHaveBeenCalledWith(null)
  })
})
