import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockPrisma, mockAuthUser } = vi.hoisted(() => {
  const mockAuthUser: { current: Record<string, unknown> | null } = { current: null }
  const mockPrisma = {
    loyaltyCard: { findUnique: vi.fn() },
    customer: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    stampLog: { create: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    user: { findUnique: vi.fn() },
  }
  return { mockPrisma, mockAuthUser }
})

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: mockAuthUser.current }, error: null })) },
  })),
}))

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/lib/account-lifecycle", () => ({
  assertBusinessWritable: vi.fn(),
  syncExpiredEntitlements: vi.fn(),
}))

vi.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}))

import { GET, POST } from "@/app/api/join/route"
import { createClient } from "@/lib/supabase-server"

function makeRequest(body: unknown) {
  return { json: async () => body } as never
}

const validCard = { id: "card1", businessId: "business1", expiresAt: null, isActive: true }

function authenticate(email = "a@b.com", confirmed = true) {
  mockAuthUser.current = {
    id: "auth-user-1",
    email,
    email_confirmed_at: confirmed ? "2026-10-15T00:00:00.000Z" : null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  authenticate()
  mockPrisma.loyaltyCard.findUnique.mockResolvedValue(validCard)
  mockPrisma.customer.findMany.mockResolvedValue([])
  mockPrisma.customer.create.mockResolvedValue({ id: "cust1" })
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma))
})

describe("POST /api/join", () => {
  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest({ email: "a@b.com", cardId: "card1" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Name is required")
  })

  it("returns 400 when name is blank", async () => {
    const res = await POST(makeRequest({ name: "   ", email: "a@b.com", cardId: "card1" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when email lacks @", async () => {
    const res = await POST(makeRequest({ name: "Ana", email: "invalidemail", cardId: "card1" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Invalid email")
  })

  it("returns 400 when cardId is missing", async () => {
    const res = await POST(makeRequest({ name: "Ana", email: "a@b.com" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Invalid card ID")
  })

  it("returns 404 when card does not exist", async () => {
    mockPrisma.loyaltyCard.findUnique.mockResolvedValue(null)
    const res = await POST(makeRequest({ name: "Ana", email: "a@b.com", cardId: "card1" }))
    expect(res.status).toBe(404)
  })

  it("returns 400 when card is expired", async () => {
    mockPrisma.loyaltyCard.findUnique.mockResolvedValue({ id: "card1", expiresAt: new Date("2020-01-01"), isActive: true })
    const res = await POST(makeRequest({ name: "Ana", email: "a@b.com", cardId: "card1" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("expired")
  })

  it("returns existing:true and does NOT call create when customer already joined", async () => {
    mockPrisma.customer.findMany.mockResolvedValue([{ email: "a@b.com" }])
    const res = await POST(makeRequest({ name: "Ana", email: "a@b.com", cardId: "card1" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.existing).toBe(true)
    expect(mockPrisma.customer.create).not.toHaveBeenCalled()
  })

  it("requires a confirmed session email before reading or changing membership", async () => {
    authenticate("a@b.com", false)
    const res = await POST(makeRequest({ name: "Ana", email: "a@b.com", cardId: "card1" }))
    expect(res.status).toBe(401)
    expect(mockPrisma.loyaltyCard.findUnique).not.toHaveBeenCalled()
  })

  it("rejects an email that does not match the confirmed session", async () => {
    authenticate("ana@b.com")
    const res = await POST(makeRequest({ name: "Ana", email: "otra@b.com", cardId: "card1" }))
    expect(res.status).toBe(403)
    expect(mockPrisma.loyaltyCard.findUnique).not.toHaveBeenCalled()
  })

  it("creates customer with trimmed name on happy path", async () => {
    const res = await POST(makeRequest({ name: "  Ana  ", email: "a@b.com", cardId: "card1" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.existing).toBe(false)
    expect(body.customerId).toBe("cust1")
    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Ana", email: "a@b.com", cardId: "card1" }),
      }),
    )
  })

  // El teclado del celular escribe «Ana@…» y Supabase guarda «ana@…». Al volver
  // del enlace mágico la página repite el alta: tiene que encontrar la primera.
  it("guarda el correo en minúsculas y busca sin distinguir mayúsculas", async () => {
    authenticate("ANA@gmail.com")
    await POST(makeRequest({ name: "Ana", email: "  Ana@Gmail.COM ", cardId: "card1" }))
    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
      where: { email: { equals: "ana@gmail.com", mode: "insensitive" }, cardId: "card1" },
      select: { id: true, email: true, isActive: true },
    })
    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "ana@gmail.com" }) }),
    )
  })
})

// El negocio lo dio de baja (`isActive: false`). Responder `existing: true`
// lo dejaba sin salida: la página mostraba un QR que el motor ya no sella.
describe("un cliente dado de baja vuelve a unirse", () => {
  it("reactiva su registro cuando la sesión es de ese correo", async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email: "A@b.com", email_confirmed_at: "2026-10-15T00:00:00.000Z" } } }) },
    } as never)
    mockPrisma.customer.findMany.mockResolvedValue([{ id: "cust-baja", email: "a@b.com", isActive: false }])
    const res = await POST(makeRequest({ name: "Ana", email: "a@b.com", cardId: "card1" }))
    expect(await res.json()).toEqual({ customerId: "cust-baja", existing: false })
    expect(mockPrisma.customer.update).toHaveBeenCalledWith({ where: { id: "cust-baja" }, data: { isActive: true } })
    expect(mockPrisma.customer.create).not.toHaveBeenCalled()
  })

  // El POST es público: sin probar el correo, cualquiera revertía la baja y se
  // llevaba el id del cliente.
  it("sin sesión responde igual sin consultar ni modificar clientes", async () => {
    mockAuthUser.current = null
    const res = await POST(makeRequest({ name: "Ana", email: "a@b.com", cardId: "card1" }))
    expect(res.status).toBe(401)
    expect(mockPrisma.loyaltyCard.findUnique).not.toHaveBeenCalled()
    expect(mockPrisma.customer.findMany).not.toHaveBeenCalled()
    expect(mockPrisma.customer.create).not.toHaveBeenCalled()
    expect(mockPrisma.customer.update).not.toHaveBeenCalled()
  })

  it("en /join no devuelve un registro dado de baja como listo", async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email: "a@b.com", email_confirmed_at: "2026-10-15T00:00:00.000Z" } } }) },
    } as never)
    await GET({ url: "http://x/api/join?email=a%40b.com&cardId=card1" } as never)
    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: { equals: "a@b.com", mode: "insensitive" }, cardId: "card1", isActive: true },
    }))
  })
})

// No hay índice único en (cardId, email): dos altas a la vez (doble toque, el
// efecto de la página que corre dos veces) veían las dos que no había nadie y
// creaban dos clientes; los sellos se repartían entre ambos.
describe("altas simultáneas", () => {
  it("bloquea el correo en la tarjeta antes de buscarlo, dentro de la misma transacción", async () => {
    const orden: string[] = []
    mockPrisma.$executeRaw.mockImplementation(async () => { orden.push("bloqueo") })
    mockPrisma.customer.findMany.mockImplementation(async () => { orden.push("buscar"); return [] })
    mockPrisma.customer.create.mockImplementation(async () => { orden.push("crear"); return { id: "cust1" } })
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) => {
      orden.push("transacción")
      return callback(mockPrisma)
    })
    await POST(makeRequest({ name: "Ana", email: "a@b.com", cardId: "card1" }))
    expect(orden).toEqual(["transacción", "bloqueo", "buscar", "crear"])
  })
})

describe("GET /api/join?email=", () => {
  it("no consulta membresías con una sesión cuyo correo no está confirmado", async () => {
    authenticate("a@b.com", false)
    const res = await GET({ url: "http://x/api/join?email=a%40b.com" } as never)
    expect(res.status).toBe(401)
    expect(mockPrisma.customer.findMany).not.toHaveBeenCalled()
  })

  it("encuentra las tarjetas aunque el correo se haya guardado con mayúsculas", async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email: "ana@gmail.com", email_confirmed_at: "2026-10-15T00:00:00.000Z" } } }) },
    } as never)
    mockPrisma.customer.findMany.mockResolvedValue([])
    const res = await GET({ url: "http://x/api/join?email=Ana%40Gmail.com" } as never)
    expect(res.status).toBe(200)
    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: { equals: "ana@gmail.com", mode: "insensitive" } } }),
    )
  })

  // Si la base resuelve `insensitive` con ILIKE, `_` es comodín: no puede
  // colarse la tarjeta de otro correo.
  it("solo devuelve las tarjetas de ese correo exacto", async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email: "ana_l@x.com", email_confirmed_at: "2026-10-15T00:00:00.000Z" } } }) },
    } as never)
    mockPrisma.customer.findMany.mockResolvedValue([
      { id: "propia", email: "Ana_L@x.com", milestoneClaims: [], stampsLog: [] },
      { id: "ajena", email: "anaxl@x.com", milestoneClaims: [], stampsLog: [] },
    ])
    const res = await GET({ url: "http://x/api/join?email=ana_l%40x.com" } as never)
    expect((await res.json()).customers.map((c: { id: string }) => c.id)).toEqual(["propia"])
  })

  it("no da por existente un alta de otro correo parecido", async () => {
    authenticate("ana_l@x.com")
    mockPrisma.customer.findMany.mockResolvedValue([{ email: "anaxl@x.com" }])
    const res = await POST(makeRequest({ name: "Ana", email: "ana_l@x.com", cardId: "card1" }))
    expect((await res.json()).existing).toBe(false)
  })
})

// Las pantallas del cliente y el escáner leen la meta de `card`. El motor canjea
// con la del ciclo en curso: si la meta cambió a mitad del ciclo, se veía «9/8»
// o se ofrecía canjear algo que el servidor rechaza.
describe("GET /api/join con la meta del ciclo en curso", () => {
  it("entrega la meta, el saldo y la recompensa del ciclo", async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email: "a@b.com", email_confirmed_at: "2026-10-15T00:00:00.000Z" } } }) },
    } as never)
    mockPrisma.customer.findMany.mockResolvedValue([{
      id: "c1", email: "a@b.com", stamps: 9, milestoneClaims: [], stampsLog: [],
      card: { stampsRequired: 8, reward: "Café" },
      currentCycle: { balance: 9, configuration: { stampsRequired: 10, reward: "Pan" } },
    }])
    const res = await GET({ url: "http://x/api/join?email=a%40b.com&cardId=card1" } as never)
    expect((await res.json()).customers[0]).toMatchObject({ stamps: 9, card: { stampsRequired: 10, reward: "Pan" } })
  })
})
