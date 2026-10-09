import { describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { ConflictError } from "@/lib/api-utils"
import { latestPlanChangeNotice, planChangeFromMetadata } from "@/lib/plan-change-notice"
import { issueManualPlanChangeNotice, previewManualPlanChangeNotice } from "@/lib/manual-plan-change-notice"

function makeDb(sourceMetadata: Record<string, unknown> = { plan: "LITE" }) {
  const current = {
    id: "subscription-current", businessId: "biz-1", plan: "LITE", status: "ACTIVE",
    proAccessGranted: false, proTrialEndsAt: null, createdAt: new Date("2026-10-06T12:00:00Z"),
  }
  const previous = {
    id: "subscription-previous", businessId: "biz-1", plan: "PRO", status: "CANCELED",
    proAccessGranted: true, proTrialEndsAt: null, createdAt: new Date("2026-09-06T12:00:00Z"),
  }
  const source = { id: "audit-original", action: "set_plan", metadata: sourceMetadata }
  const db = {
    source,
    subscription: {
      findFirst: vi.fn().mockResolvedValue(current),
      findMany: vi.fn().mockResolvedValue([current, previous]),
      create: vi.fn(), updateMany: vi.fn(), update: vi.fn(),
    },
    billingAuditEvent: {
      findFirst: vi.fn().mockResolvedValue(source),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "audit-notice", ...data })),
      update: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((run) => run(db)),
  }
  return db
}

describe("manual plan change notice", () => {
  it("preserves the original audit and creates a member-visible notice with its issuer", async () => {
    const db = makeDb()
    const preview = await previewManualPlanChangeNotice(db as unknown as PrismaClient, "biz-1")
    expect(preview).toEqual({ businessId: "biz-1", sourceEventId: "audit-original", previousPlan: "PRO", effectivePlan: "LITE" })

    const event = await issueManualPlanChangeNotice(db as unknown as PrismaClient, {
      ...preview, summary: "Cambio aplicado por soporte", operator: "Raúl",
    })

    expect(db.$transaction).toHaveBeenCalledOnce()
    expect(db.billingAuditEvent.create).toHaveBeenCalledOnce()
    expect(db.billingAuditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "manual_plan_change_notice", operator: "Raúl",
      idempotencyKey: "manual-plan-change-notice:audit-original",
      metadata: { previousPlan: "PRO", effectivePlan: "LITE", summary: "Cambio aplicado por soporte", sourceEventId: "audit-original" },
    }) })
    expect(planChangeFromMetadata(event.metadata, "LITE")).toEqual({ from: "PRO", to: "LITE" })
    expect(latestPlanChangeNotice([{ id: event.id, metadata: event.metadata }], "LITE")).toEqual({ eventId: "audit-notice", from: "PRO", to: "LITE" })
    expect(db.source.metadata).toEqual({ plan: "LITE" })
    expect(db.billingAuditEvent.update).not.toHaveBeenCalled()
    expect(db.subscription.create).not.toHaveBeenCalled()
    expect(db.subscription.updateMany).not.toHaveBeenCalled()
    expect(db.subscription.update).not.toHaveBeenCalled()
  })

  it("rejects a requested destination that differs from the effective plan", async () => {
    const db = makeDb()
    await expect(issueManualPlanChangeNotice(db as unknown as PrismaClient, {
      businessId: "biz-1", sourceEventId: "audit-original", previousPlan: "LITE", effectivePlan: "PRO",
      summary: "Cambio", operator: "Raúl",
    })).rejects.toBeInstanceOf(ConflictError)
    expect(db.billingAuditEvent.create).not.toHaveBeenCalled()
  })

  it("refuses a manual notice when the original audit already records the transition", async () => {
    const db = makeDb({ plan: "LITE", previousPlan: "PRO", effectivePlan: "LITE" })
    await expect(previewManualPlanChangeNotice(db as unknown as PrismaClient, "biz-1")).rejects.toBeInstanceOf(ConflictError)
    expect(db.billingAuditEvent.create).not.toHaveBeenCalled()
  })

  it("finds the missing transition across a later renewal of the same plan", async () => {
    const db = makeDb()
    const renewal = db.subscription.findMany.getMockImplementation()!
    const history = await renewal({})
    history[0].createdAt = new Date("2026-11-06T12:00:00Z")
    history.splice(1, 0, {
      id: "subscription-change", businessId: "biz-1", plan: "LITE", status: "CANCELED",
      proAccessGranted: false, proTrialEndsAt: null, createdAt: new Date("2026-10-06T12:00:00Z"),
    })
    db.billingAuditEvent.findFirst.mockImplementation(({ where }) => Promise.resolve({
      id: where.createdAt.lt ? "audit-original" : "audit-renewal",
      action: "set_plan", metadata: { plan: "LITE" },
    }))

    const preview = await previewManualPlanChangeNotice(db as unknown as PrismaClient, "biz-1")
    expect(preview).toEqual({ businessId: "biz-1", sourceEventId: "audit-original", previousPlan: "PRO", effectivePlan: "LITE" })
  })
})
