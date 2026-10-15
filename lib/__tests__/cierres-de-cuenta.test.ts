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

// Una invitación guarda el `authUserId` que creó Supabase aunque no se acepte.
// Si esa persona entró después a otro negocio, cerrar el primero le borraba la
// cuenta de acceso y la dejaba fuera del segundo.
describe("cuentas de acceso al cerrar un negocio", () => {
  it("no borra la de alguien que es miembro de otro negocio", async () => {
    const db = {
      accountClosure: { findMany: vi.fn().mockResolvedValue([{ id: "cierre", businessId: "biz-a", status: "SCHEDULED" }]), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      accountClosureExecution: { upsert: vi.fn().mockResolvedValue({ id: "exec" }), updateMany: vi.fn() },
      accountClosureCleanupTask: { createMany: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      businessAvatarAsset: { findMany: vi.fn().mockResolvedValue([]) },
      user: { findMany: vi.fn(async ({ where }: { where: { businessId?: string } }) => where.businessId === "biz-a" ? [{ authUserId: "auth-propio" }] : [{ authUserId: "auth-de-b" }]) },
      teamInvitation: { findMany: vi.fn().mockResolvedValue([{ authUserId: "auth-de-b" }]) },
      customerProfile: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn({ stampLog: { updateMany: vi.fn() }, business: { delete: vi.fn() }, accountClosureExecution: { update: vi.fn() } })),
    }

    await executeDueClosures(db as never)

    const tareas = db.accountClosureCleanupTask.createMany.mock.calls[0][0].data as Array<{ kind: string; subjectId: string }>
    expect(tareas.filter((t) => t.kind === "AUTH_USER").map((t) => t.subjectId)).toEqual(["auth-propio"])
  })
})
