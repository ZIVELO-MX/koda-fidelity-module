import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const { executeDueClosures } = vi.hoisted(() => ({ executeDueClosures: vi.fn() }))
vi.mock("@/lib/account-lifecycle", () => ({ executeDueClosures }))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))

import { POST } from "./route"

function request(authorization?: string) {
  return new Request("http://localhost/api/cron/account-closures", { headers: authorization ? { authorization, "x-request-id": "req-test" } : { "x-request-id": "req-test" } }) as unknown as NextRequest
}

describe("account closure scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = "cron-secret"
    executeDueClosures.mockResolvedValue(2)
  })

  it("rejects an invalid credential with the request id envelope", async () => {
    const response = await POST(request("Bearer wrong"))
    expect(response.status).toBe(401)
    expect(response.headers.get("x-request-id")).toBe("req-test")
    expect(await response.json()).toMatchObject({ code: "KF-AUTH-001", requestId: "req-test", retryable: false })
    expect(executeDueClosures).not.toHaveBeenCalled()
  })

  it("processes due closures with a valid credential", async () => {
    const response = await POST(request("Bearer cron-secret"))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ processed: 2 })
    expect(response.headers.get("x-request-id")).toBe("req-test")
  })
})
