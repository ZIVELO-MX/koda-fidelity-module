import { beforeEach, describe, expect, it, vi } from "vitest"

const { createClient, userFindUnique, userUpdate, auditFindFirst, getUser } = vi.hoisted(() => ({
  createClient: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  auditFindFirst: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock("@/lib/supabase-server", () => ({ createClient }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUnique, update: userUpdate },
    billingAuditEvent: { findFirst: auditFindFirst },
  },
}))

import { acknowledgePlanChangeNotice } from "./plan-change-notice"

describe("acknowledgePlanChangeNotice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createClient.mockResolvedValue({ auth: { getUser } })
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } })
    userFindUnique.mockResolvedValue({ id: "member", businessId: "business", planChangeNoticeSeenAt: new Date("2026-01-01T00:00:00Z") })
    auditFindFirst.mockResolvedValue({ createdAt: new Date("2026-02-01T00:00:00Z"), metadata: { previousPlan: "PRO", effectivePlan: "LITE" } })
  })

  it("marks only a new plan transition for the authenticated user's business as seen", async () => {
    await expect(acknowledgePlanChangeNotice("event-id")).resolves.toBe(true)
    expect(auditFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "event-id", businessId: "business" }) }))
    expect(userUpdate).toHaveBeenCalledWith({ where: { id: "member" }, data: { planChangeNoticeSeenAt: new Date("2026-02-01T00:00:00Z") } })
  })

  it("does not acknowledge for a signed-out visitor", async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    await expect(acknowledgePlanChangeNotice("event-id")).resolves.toBe(false)
    expect(userFindUnique).not.toHaveBeenCalled()
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it("ignores audit events that do not represent a plan transition", async () => {
    auditFindFirst.mockResolvedValue({ createdAt: new Date(), metadata: { plan: "LITE" } })
    await expect(acknowledgePlanChangeNotice("event-id")).resolves.toBe(false)
    expect(userUpdate).not.toHaveBeenCalled()
  })
})
