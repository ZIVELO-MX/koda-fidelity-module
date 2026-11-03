import { describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { stampLog: { findMany } } }))
vi.mock("@/lib/api-utils", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")),
  getBusinessFromSession: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
}))

import { GET } from "./route"

// El motor registra un `milestone` en cada sello con sorpresa, la gane o no
// (`metadata.outcome`). El panel mostraba «Sorpresa» también cuando no hubo premio.
describe("GET /api/dashboard/activity", () => {
  it("deja fuera las sorpresas que no se entregaron", async () => {
    findMany.mockResolvedValue([])
    await GET(new Request("http://localhost/api/dashboard/activity") as NextRequest)
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ NOT: { type: "milestone", metadata: { path: ["outcome"], not: "awarded" } } }),
    }))
  })
})
