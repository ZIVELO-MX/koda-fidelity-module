import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { tx, applyEntitlements } = vi.hoisted(() => ({
  tx: { subscription: { updateMany: vi.fn() } },
  applyEntitlements: vi.fn(),
}))
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } }))
vi.mock("@/lib/account-lifecycle", () => ({
  applyEntitlements,
  assertBusinessWritable: vi.fn(),
  activateManualSubscription: vi.fn(),
  getEntitlements: vi.fn(),
  syncExpiredEntitlements: vi.fn(),
}))

import { POST } from "./route"

const operar = (body: unknown, clave = "secreto") =>
  POST({ json: async () => body, headers: new Headers({ "x-billing-internal-secret": clave }) } as never)

describe("POST /api/subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_INTERNAL_SECRET = "secreto"
    tx.subscription.updateMany.mockResolvedValue({ count: 1 })
  })
  afterEach(() => { delete process.env.BILLING_INTERNAL_SECRET })

  it("answers 401 to a wrong internal key", async () => {
    expect((await operar({ businessId: "biz1", action: "cancel" }, "otra")).status).toBe(401)
    expect(tx.subscription.updateMany).not.toHaveBeenCalled()
  })

  // Antes solo cambiaba el estado y las tarjetas seguían activas y con acabados Pro.
  it.each([["cancel", "CANCELED"], ["past_due", "PAST_DUE"]])("applies Lite entitlements on %s", async (action, status) => {
    expect((await operar({ businessId: "biz1", action })).status).toBe(200)
    expect(tx.subscription.updateMany).toHaveBeenCalledWith({ where: { businessId: "biz1", status: "ACTIVE" }, data: { status } })
    expect(applyEntitlements).toHaveBeenCalledWith(tx, "biz1", "LITE")
  })
})
