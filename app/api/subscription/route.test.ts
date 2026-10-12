import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))

import { POST } from "./route"

function request(secret: string) {
  return new Request("http://localhost/api/subscription", {
    method: "POST",
    headers: { "content-type": "application/json", "x-billing-internal-secret": secret },
    body: JSON.stringify({ businessId: "biz-1", action: "set_plan", plan: "PRO", billingInterval: "ANNUAL" }),
  }) as NextRequest
}

describe("POST /api/subscription", () => {
  beforeEach(() => vi.stubEnv("BILLING_INTERNAL_SECRET", "local-secret"))
  afterEach(() => vi.unstubAllEnvs())

  it("returns 401 for an invalid internal secret", async () => {
    expect((await POST(request("wrong-secret"))).status).toBe(401)
  })
})
