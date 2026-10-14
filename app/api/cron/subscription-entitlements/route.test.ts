import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const { syncExpiredEntitlementsBatch } = vi.hoisted(() => ({ syncExpiredEntitlementsBatch: vi.fn() }))
vi.mock("@/lib/account-lifecycle", () => ({ syncExpiredEntitlementsBatch }))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))

import { POST } from "./route"

function request(authorization?: string) {
  return new Request("http://localhost/api/cron/subscription-entitlements", { headers: authorization ? { authorization, "x-request-id": "req-test" } : { "x-request-id": "req-test" } }) as unknown as NextRequest
}

describe("subscription entitlement scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = "cron-secret"
    syncExpiredEntitlementsBatch.mockResolvedValue(2)
  })

  it("rejects an invalid credential with the request id envelope", async () => {
    const response = await POST(request("Bearer wrong"))
    expect(response.status).toBe(401)
    expect(response.headers.get("x-request-id")).toBe("req-test")
    expect(await response.json()).toMatchObject({ code: "KF-AUTH-001", requestId: "req-test", retryable: false })
    expect(syncExpiredEntitlementsBatch).not.toHaveBeenCalled()
  })

  it("processes expired trials with a valid credential", async () => {
    const response = await POST(request("Bearer cron-secret"))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ processed: 2 })
    expect(response.headers.get("x-request-id")).toBe("req-test")
  })
})
