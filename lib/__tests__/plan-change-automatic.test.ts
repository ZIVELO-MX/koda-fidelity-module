import { describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { activateManualSubscription } from "@/lib/account-lifecycle"
import { planChangeFromMetadata } from "@/lib/plan-change-notice"

function makeDb(previousPlan: "LITE" | "PRO") {
  const previous = {
    id: "previous", businessId: "biz-1", status: "ACTIVE", plan: previousPlan,
    proAccessGranted: previousPlan === "PRO", proTrialEndsAt: null,
  }
  const tx = {
    subscription: {
      findFirst: vi.fn().mockResolvedValue(previous),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "new", status: "ACTIVE", ...data })),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "new", status: "ACTIVE", ...data })),
    },
    loyaltyCard: { findMany: vi.fn().mockResolvedValue([]) },
    loyaltyTheme: { findMany: vi.fn().mockResolvedValue([]) },
    onboardingProgress: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    billingAuditEvent: { create: vi.fn().mockResolvedValue({ id: "audit" }) },
  }
  const db = {
    business: { findUnique: vi.fn().mockResolvedValue({ id: "biz-1" }) },
    billingAuditEvent: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn().mockImplementation((run) => run(tx)),
  }
  return { db, tx }
}

describe("automatic plan change audit", () => {
  it.each([
    ["LITE", "PRO"],
    ["PRO", "LITE"],
  ] as const)("writes the %s → %s transition inside the subscription transaction", async (from, to) => {
    const { db, tx } = makeDb(from)
    await activateManualSubscription(db as unknown as PrismaClient, {
      businessId: "biz-1", action: "set_plan", plan: to, proAccessGranted: to === "PRO",
      periodStart: new Date("2026-10-06T12:00:00Z"), idempotencyKey: `change-${from}-${to}`,
    })

    expect(db.$transaction).toHaveBeenCalledOnce()
    expect(tx.subscription.create).toHaveBeenCalledOnce()
    expect(tx.billingAuditEvent.create).toHaveBeenCalledOnce()
    const audit = tx.billingAuditEvent.create.mock.calls[0][0].data
    expect(audit.metadata).toMatchObject({ previousPlan: from, effectivePlan: to })
    expect(planChangeFromMetadata(audit.metadata, to)).toEqual({ from, to })
  })
})
