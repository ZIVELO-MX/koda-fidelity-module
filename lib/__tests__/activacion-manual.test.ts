import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase-admin", () => ({ createAdminClient: vi.fn() }))

import { activateManualSubscription } from "@/lib/account-lifecycle"
import { AccountReadOnlyError, ConflictError } from "@/lib/api-utils"

type Sub = { id: string; plan: "LITE" | "PRO"; billingInterval: "MONTHLY" | "ANNUAL"; status: string; liteCardId: string | null; proAccessGranted: boolean; proTrialEndsAt: Date | null }

function db({ activa = null as Sub | null, ultima = null as Sub | null, cierre = false, auditoria = null as { businessId: string } | null } = {}) {
  const tarjetas = [
    { id: "card-a", status: "LOCKED_BY_PLAN", isLite: false, selectedThemeId: null, createdAt: new Date("2026-01-01") },
    { id: "card-b", status: "LOCKED_BY_PLAN", isLite: false, selectedThemeId: null, createdAt: new Date("2026-02-01") },
  ]
  const tx = {
    subscription: {
      findFirst: vi.fn(async ({ where }: { where: { status?: string } }) => where.status === "ACTIVE" ? activa : ultima ?? activa),
      updateMany: vi.fn(),
      create: vi.fn(async ({ data }: { data: object }) => ({ id: "sub-nueva", status: "ACTIVE", ...data })),
      update: vi.fn(async ({ data }: { data: object }) => ({ id: "sub-nueva", ...data })),
    },
    onboardingProgress: { findFirst: vi.fn().mockResolvedValue({ firstCardId: "card-a" }), updateMany: vi.fn() },
    loyaltyCard: { findMany: vi.fn().mockResolvedValue(tarjetas), update: vi.fn() },
    loyaltyTheme: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    billingAuditEvent: { create: vi.fn() },
  }
  const base = {
    business: { findUnique: vi.fn().mockResolvedValue({ id: "biz" }) },
    accountClosure: { findFirst: vi.fn().mockResolvedValue(cierre ? { scheduledFor: new Date("2026-12-01") } : null) },
    billingAuditEvent: { findUnique: vi.fn().mockResolvedValue(auditoria) },
    subscription: { findFirst: tx.subscription.findFirst },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  }
  return { base: base as never, tx }
}

describe("activateManualSubscription", () => {
  // Cancelar, past_due o INACTIVO dejan la suscripción con su `liteCardId`. Al
  // reactivar solo se miraba la ACTIVE, y la principal elegida se perdía por la
  // tarjeta del alta.
  it("conserva la tarjeta principal de la última suscripción al reactivar", async () => {
    const { base, tx } = db({ ultima: { id: "sub-vieja", plan: "LITE", billingInterval: "MONTHLY", status: "CANCELED", liteCardId: "card-b", proAccessGranted: false, proTrialEndsAt: null } })
    await activateManualSubscription(base, { businessId: "biz", plan: "LITE", proAccessGranted: false, idempotencyKey: "k1" })
    expect(tx.subscription.create).toHaveBeenCalledWith({ data: expect.objectContaining({ liteCardId: "card-b" }) })
    expect(tx.loyaltyCard.update).toHaveBeenCalledWith({ where: { id: "card-b" }, data: expect.objectContaining({ status: "ACTIVE" }) })
  })

  it("usa la tarjeta del alta en la primera activación", async () => {
    const { base, tx } = db()
    await activateManualSubscription(base, { businessId: "biz", plan: "LITE", proAccessGranted: false, idempotencyKey: "k2" })
    expect(tx.subscription.create).toHaveBeenCalledWith({ data: expect.objectContaining({ liteCardId: "card-a" }) })
  })

  // Una clave ya usada por otro negocio respondía 201 sin activar nada.
  it("rechaza una clave de operación de otro negocio", async () => {
    const { base, tx } = db({ auditoria: { businessId: "otro" } })
    await expect(activateManualSubscription(base, { businessId: "biz", plan: "PRO", idempotencyKey: "ajena" })).rejects.toBeInstanceOf(ConflictError)
    expect(tx.subscription.create).not.toHaveBeenCalled()
  })

  // Los scripts de facturación llaman directo y reactivaban un negocio en cierre.
  it("no activa un negocio con el cierre programado", async () => {
    const { base, tx } = db({ cierre: true })
    await expect(activateManualSubscription(base, { businessId: "biz", plan: "PRO", idempotencyKey: "k3" })).rejects.toBeInstanceOf(AccountReadOnlyError)
    expect(tx.subscription.create).not.toHaveBeenCalled()
  })

})
