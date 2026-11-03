import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { getUser, findCustomer, findCard, generateLoyaltyPass, generateLoyaltyPassJwt } = vi.hoisted(() => ({
  getUser: vi.fn(),
  findCustomer: vi.fn(),
  findCard: vi.fn(),
  generateLoyaltyPass: vi.fn().mockResolvedValue(Buffer.from("pkpass")),
  generateLoyaltyPassJwt: vi.fn().mockResolvedValue("jwt"),
}))
vi.mock("@/lib/supabase-server", () => ({ createClient: async () => ({ auth: { getUser } }) }))
vi.mock("@/lib/prisma", () => ({ prisma: { customer: { findUnique: findCustomer, update: vi.fn() }, loyaltyCard: { findUnique: findCard } } }))
vi.mock("@/lib/passes/apple", () => ({ generateLoyaltyPass }))
vi.mock("@/lib/passes/google", () => ({ generateLoyaltyPassJwt, getSaveUrl: () => "https://pay.google.com/save/jwt", isConfigured: () => true, getConfigError: () => null }))

import { POST as applePost } from "./apple/[cardId]/route"
import { POST as googlePost } from "./google/[cardId]/route"

const pedir = (handler: typeof applePost) => handler(
  new Request("http://localhost/api/passes/card-1", { method: "POST", body: JSON.stringify({ customerId: "cust-1" }) }) as never,
  { params: Promise.resolve({ cardId: "card-1" }) },
)

// El pase lleva el nombre y el avance del cliente, y su QR es lo que el negocio
// escanea para sellar. Bastaba conocer `cardId` y `customerId`, sin sesión.
describe.each([["Apple", applePost], ["Google", googlePost]])("pase de %s", (_nombre, handler) => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FID_WALLET_ENABLED = "true"
    findCustomer.mockResolvedValue({ id: "cust-1", cardId: "card-1", email: "ana@test.invalid", name: "Ana", stamps: 3 })
    findCard.mockResolvedValue({ id: "card-1", name: "Club", reward: "Café", stampsRequired: 10, brandColor: "#ff6b35", business: { name: "Café" } })
  })
  afterEach(() => { delete process.env.FID_WALLET_ENABLED })

  it("pide sesión", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect((await pedir(handler)).status).toBe(401)
    expect(generateLoyaltyPass).not.toHaveBeenCalled()
    expect(generateLoyaltyPassJwt).not.toHaveBeenCalled()
  })

  it("no entrega el pase de otro cliente", async () => {
    getUser.mockResolvedValue({ data: { user: { email: "otra@test.invalid", email_confirmed_at: "2026-10-15T00:00:00Z" } }, error: null })
    expect((await pedir(handler)).status).toBe(404)
    expect(generateLoyaltyPass).not.toHaveBeenCalled()
    expect(generateLoyaltyPassJwt).not.toHaveBeenCalled()
  })

  it("entrega el pase a su dueño", async () => {
    getUser.mockResolvedValue({ data: { user: { email: "Ana@test.invalid", email_confirmed_at: "2026-10-15T00:00:00Z" } }, error: null })
    expect((await pedir(handler)).status).toBe(200)
  })
})
