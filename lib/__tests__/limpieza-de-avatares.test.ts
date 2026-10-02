import { describe, expect, it, vi } from "vitest"

const { remove } = vi.hoisted(() => ({ remove: vi.fn() }))
vi.mock("@/lib/supabase-admin", () => ({ createAdminClient: () => ({ storage: { from: () => ({ remove }) } }) }))

import { cleanupPendingCustomerAvatars } from "@/lib/account-lifecycle"

// Los trabajos de limpieza no tenían quién los ejecutara: la foto que el
// cliente quitaba seguía en el bucket.
describe("cleanupPendingCustomerAvatars", () => {
  it("deletes the replaced file and records the job as completed", async () => {
    remove.mockResolvedValue({ error: null })
    const db = {
      avatarCleanupJob: {
        findMany: vi.fn().mockResolvedValue([{ id: "job1" }]),
        findUnique: vi.fn().mockResolvedValue({ id: "job1", bucket: "avatars", storagePath: "customer/p1/vieja.webp" }),
        update: vi.fn(),
      },
    }
    await cleanupPendingCustomerAvatars(db as never, "p1")
    expect(db.avatarCleanupJob.findMany).toHaveBeenCalledWith({ where: { profileId: "p1", status: { not: "COMPLETED" } }, select: { id: true } })
    expect(remove).toHaveBeenCalledWith(["customer/p1/vieja.webp"])
    expect(db.avatarCleanupJob.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "COMPLETED" }) }))
  })
})
