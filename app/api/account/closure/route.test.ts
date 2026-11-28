import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"
import { POST } from "./route"

const { scheduleClosure, cancelClosure, executeDueClosures } = vi.hoisted(() => ({
  scheduleClosure: vi.fn(),
  cancelClosure: vi.fn(),
  executeDueClosures: vi.fn(),
}))
vi.mock("@/lib/account-lifecycle", () => ({ scheduleClosure, cancelClosure, executeDueClosures }))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("ACCOUNT_CLOSURE_INTERNAL_SECRET", "support-secret")
})
afterEach(() => vi.unstubAllEnvs())

function post(body: object, secret?: string) {
  return POST(new Request("http://localhost/api/account/closure", {
    method: "POST",
    headers: secret ? { "x-account-closure-secret": secret } : {},
    body: JSON.stringify(body),
  }) as NextRequest)
}

describe("cierre de cuenta por soporte", () => {
  it.each(["schedule", "cancel", "execute"])("requiere autorización interna para %s", async action => {
    expect((await post({ action, businessId: "biz-a" })).status).toBe(401)
    expect(scheduleClosure).not.toHaveBeenCalled()
    expect(cancelClosure).not.toHaveBeenCalled()
    expect(executeDueClosures).not.toHaveBeenCalled()
  })

  it("solo ejecuta el cierre del negocio indicado", async () => {
    expect((await post({ action: "execute" }, "support-secret")).status).toBe(400)
    expect(executeDueClosures).not.toHaveBeenCalled()
    executeDueClosures.mockResolvedValue(1)
    const response = await post({ action: "execute", businessId: "biz-a" }, "support-secret")
    expect(await response.json()).toEqual({ processed: 1 })
    expect(executeDueClosures).toHaveBeenCalledExactlyOnceWith(expect.anything(), expect.any(Date), "biz-a")
  })

  it("permite programar y solicitar cancelación al operador", async () => {
    scheduleClosure.mockResolvedValue({ id: "closure-a" })
    cancelClosure.mockResolvedValue({ count: 1 })
    expect((await post({ action: "schedule", businessId: "biz-a" }, "support-secret")).status).toBe(201)
    expect((await post({ action: "cancel", businessId: "biz-a" }, "support-secret")).status).toBe(200)
    expect(scheduleClosure).toHaveBeenCalledExactlyOnceWith(expect.anything(), "biz-a")
    expect(cancelClosure).toHaveBeenCalledExactlyOnceWith(expect.anything(), "biz-a")
  })
})
