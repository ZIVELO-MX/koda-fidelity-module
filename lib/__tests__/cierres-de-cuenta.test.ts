import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase-admin", () => ({ createAdminClient: vi.fn() }))

import { executeDueClosures } from "@/lib/account-lifecycle"

// Antes una excepción al borrar un negocio salía del `for`: cortaba el lote y
// dejaba ese cierre en PROCESSING.
describe("executeDueClosures", () => {
  it("marks a failing closure FAILED and keeps processing the rest", async () => {
    const tx = {
      stampLog: { updateMany: vi.fn() },
      business: { delete: vi.fn() },
      accountClosureExecution: { update: vi.fn() },
    }
    const db = {
      accountClosure: {
        findMany: vi.fn().mockResolvedValue([
          { id: "falla", businessId: "biz-falla", status: "SCHEDULED" },
          { id: "sale", businessId: "biz-sale", status: "SCHEDULED" },
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      accountClosureExecution: { upsert: vi.fn(async ({ where }: { where: { closureId: string } }) => ({ id: `exec-${where.closureId}` })), updateMany: vi.fn() },
      accountClosureCleanupTask: { createMany: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      businessAvatarAsset: { findMany: vi.fn().mockResolvedValue([]) },
      user: { findMany: vi.fn().mockResolvedValue([]) },
      teamInvitation: { findMany: vi.fn().mockResolvedValue([]) },
      customerProfile: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn()
        .mockRejectedValueOnce(new Error("violates foreign key constraint"))
        .mockImplementationOnce(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    }

    await expect(executeDueClosures(db as never)).resolves.toBe(1)
    expect(tx.business.delete).toHaveBeenCalledWith({ where: { id: "biz-sale" } })
    expect(db.accountClosure.updateMany).toHaveBeenCalledWith({ where: { id: "falla" }, data: { status: "FAILED" } })
    expect(db.accountClosureExecution.updateMany).toHaveBeenCalledWith({
      where: { closureId: "falla" },
      data: { status: "FAILED", lastError: "violates foreign key constraint", leaseUntil: null },
    })
  })
})
