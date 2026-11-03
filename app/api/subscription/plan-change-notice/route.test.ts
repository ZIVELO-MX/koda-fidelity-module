import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const { issueManualPlanChangeNotice } = vi.hoisted(() => ({ issueManualPlanChangeNotice: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/manual-plan-change-notice", () => ({ issueManualPlanChangeNotice }))

import { POST } from "./route"

function request(secret: string, operator = "Raúl") {
  return new Request("http://localhost/api/subscription/plan-change-notice", {
    method: "POST",
    headers: { "content-type": "application/json", "x-billing-internal-secret": secret, "x-operator": operator },
    body: JSON.stringify({
      businessId: "biz-1", sourceEventId: "audit-original", previousPlan: "PRO", effectivePlan: "LITE", summary: "Cambio previo",
    }),
  }) as NextRequest
}

describe("POST /api/subscription/plan-change-notice", () => {
  beforeEach(() => {
    vi.stubEnv("BILLING_INTERNAL_SECRET", "local-secret")
    issueManualPlanChangeNotice.mockResolvedValue({ id: "notice-1", action: "manual_plan_change_notice" })
  })
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("requires the internal secret and an identified operator", async () => {
    expect((await POST(request("wrong-secret"))).status).toBe(401)
    expect((await POST(request("local-secret", ""))).status).toBe(400)
    expect(issueManualPlanChangeNotice).not.toHaveBeenCalled()
  })

  it("passes the validated notice to the server-side audit operation", async () => {
    const response = await POST(request("local-secret"))
    expect(response.status).toBe(201)
    expect(issueManualPlanChangeNotice).toHaveBeenCalledWith(expect.anything(), {
      businessId: "biz-1", sourceEventId: "audit-original", previousPlan: "PRO", effectivePlan: "LITE",
      summary: "Cambio previo", operator: "Raúl",
    })
    expect(await response.json()).toEqual({ event: { id: "notice-1", action: "manual_plan_change_notice" } })
  })
})
