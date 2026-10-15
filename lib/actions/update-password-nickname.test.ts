import { beforeEach, describe, expect, it, vi } from "vitest"

const { updateUser, userFindUnique, businessUpdate, userUpdateMany } = vi.hoisted(() => ({
  updateUser: vi.fn(),
  userFindUnique: vi.fn(),
  businessUpdate: vi.fn(),
  userUpdateMany: vi.fn(),
}))

vi.mock("@/lib/supabase-server", () => ({ createClient: async () => ({ auth: { updateUser } }) }))
vi.mock("@/lib/supabase-admin", () => ({ createAdminClient: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: userFindUnique, updateMany: userUpdateMany }, business: { update: businessUpdate } } }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({ headers: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { updatePassword } from "./auth"

function formulario() {
  const datos = new FormData()
  datos.set("password", "Contrasena-Segura-2026")
  datos.set("confirm", "Contrasena-Segura-2026")
  datos.set("nickname", "Mono")
  return datos
}

// El apodo es del negocio entero: un sellador invitado lo cambiaba para todos
// en su primer acceso.
describe("updatePassword y el apodo del negocio", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateUser.mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null })
  })

  it("no deja que un sellador cambie el apodo", async () => {
    userFindUnique.mockResolvedValue({ businessId: "business-1", role: "sellador" })
    await updatePassword({}, formulario())
    expect(businessUpdate).not.toHaveBeenCalled()
    expect(userUpdateMany).toHaveBeenCalled()
  })

  it("guarda el apodo que escribe un admin", async () => {
    userFindUnique.mockResolvedValue({ businessId: "business-1", role: "admin" })
    await updatePassword({}, formulario())
    expect(businessUpdate).toHaveBeenCalledWith({ where: { id: "business-1" }, data: { nickname: "Mono" } })
  })
})
