import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const { tx } = vi.hoisted(() => ({
  tx: { subscription: { updateMany: vi.fn() }, loyaltyCard: { updateMany: vi.fn() } },
}))
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } }))
vi.mock("@/lib/account-lifecycle", () => ({
  assertBusinessWritable: vi.fn(),
  activateManualSubscription: vi.fn(),
  getEntitlements: vi.fn(),
  syncExpiredEntitlements: vi.fn(),
}))

import { POST } from "./route"

function request(secret: string) {
  return new Request("http://localhost/api/subscription", {
    method: "POST",
    headers: { "content-type": "application/json", "x-billing-internal-secret": secret },
    body: JSON.stringify({ businessId: "biz-1", action: "set_plan", plan: "PRO", billingInterval: "ANNUAL" }),
  }) as NextRequest
}

describe("POST /api/subscription", () => {
  beforeEach(() => vi.stubEnv("BILLING_INTERNAL_SECRET", "local-secret"))
  afterEach(() => vi.unstubAllEnvs())

  it("returns 401 for an invalid internal secret", async () => {
    expect((await POST(request("wrong-secret"))).status).toBe(401)
  })
})

describe("POST /api/subscription cancel y past_due", () => {
  const operar = (body: unknown) =>
    POST({ json: async () => body, headers: new Headers({ "x-billing-internal-secret": "local-secret" }) } as never)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("BILLING_INTERNAL_SECRET", "local-secret")
    tx.subscription.updateMany.mockResolvedValue({ count: 1 })
  })
  afterEach(() => vi.unstubAllEnvs())

  // Antes solo cambiaba el estado y las tarjetas seguían activas y con acabados
  // Pro. Sin suscripción activa no hay acceso, como `INACTIVO` en PR #152.
  it.each([["cancel", "CANCELED"], ["past_due", "PAST_DUE"]])("locks every non-archived card on %s", async (action, status) => {
    expect((await operar({ businessId: "biz1", action })).status).toBe(200)
    expect(tx.subscription.updateMany).toHaveBeenCalledWith({ where: { businessId: "biz1", status: "ACTIVE" }, data: { status } })
    expect(tx.loyaltyCard.updateMany).toHaveBeenCalledWith({
      where: { businessId: "biz1", status: { not: "ARCHIVED" } },
      data: { isActive: false, isLite: false, status: "LOCKED_BY_PLAN", effectiveThemeId: null },
    })
  })
})
