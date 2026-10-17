import { describe, expect, it, vi } from "vitest"

const { findIntent, upsert, update, signUp } = vi.hoisted(() => ({
  findIntent: vi.fn().mockResolvedValue(null),
  upsert: vi.fn(),
  update: vi.fn(),
  signUp: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" }, session: null }, error: null }),
}))

vi.mock("@/lib/auth-service", () => ({ authService: { signIn: vi.fn() } }))
vi.mock("@/lib/config", () => ({ config: { isInviteOnly: false, isDebugEmail: () => false } }))
vi.mock("@/lib/prisma", () => ({ prisma: { signupIntent: { findUnique: findIntent, upsert, update } } }))
vi.mock("@/lib/supabase-server", () => ({ createClient: async () => ({ auth: { signUp } }) }))
vi.mock("@/lib/supabase-admin", () => ({ createAdminClient: vi.fn() }))
vi.mock("@/lib/auth-security", () => ({ enforceRateLimit: vi.fn(), normalizeEmail: (email: string) => email.trim().toLowerCase() }))
vi.mock("@/lib/signup-provisioning", () => ({ provisionSignup: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { signup } from "./auth"

// `signup` no pide sesión. Con un `update` que reescribía el tipo y el nombre,
// quien se registrara con el correo de otro antes de que lo confirmara le
// cambiaba la cuenta: al confirmar, el dueño recibía un perfil de cliente en
// vez de su negocio.
describe("signup y el alta pendiente de ese correo", () => {
  it("no cambia el tipo ni el nombre de un alta que ya existe", async () => {
    const datos = new FormData()
    for (const [clave, valor] of Object.entries({ email: "dueno@test.invalid", password: "Clave-Segura-1", confirm: "Clave-Segura-1", accountType: "CUSTOMER", name: "Otro" })) datos.set(clave, valor)

    await signup({}, datos)

    expect(upsert).toHaveBeenCalledWith({
      where: { email: "dueno@test.invalid" },
      create: { email: "dueno@test.invalid", name: "Otro", accountType: "CUSTOMER" },
      update: {},
    })
  })

  // Antes de confirmar nadie probó ser dueño del correo: ni reemplazar en
  // silencio el tipo (ganaba el último) ni ignorar el nuevo (ganaba el primero,
  // y se podía apartar el correo de un negocio como cliente). Se rechaza.
  it("rechaza un registro de otro tipo sobre un alta pendiente", async () => {
    findIntent.mockResolvedValueOnce({ accountType: "BUSINESS", status: "pending" })
    signUp.mockClear()
    const datos = new FormData()
    for (const [clave, valor] of Object.entries({ email: "dueno@test.invalid", password: "Clave-Segura-1", confirm: "Clave-Segura-1", accountType: "CUSTOMER", name: "Otro" })) datos.set(clave, valor)

    const resultado = await signup({}, datos)

    expect(resultado.error).toMatch(/registro pendiente/)
    expect(signUp).not.toHaveBeenCalled()
  })
})
