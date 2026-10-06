import { describe, expect, it, vi } from "vitest"
import { changePlanThroughApi, parsePlan, PlanApiError } from "./fidelity-admin-plan"

const input = {
  baseUrl: "http://localhost:3000",
  secret: "local-secret",
  businessId: "biz-1",
  plan: "PRO" as const,
  billingInterval: "MONTHLY" as const,
  operator: "support",
}

describe("Fidelity admin plan change", () => {
  it("normalizes the requested plan", () => {
    expect(parsePlan(" pro ")).toBe("PRO")
    expect(() => parsePlan("premium")).toThrow("LITE o PRO")
  })

  it("sends an authenticated, idempotent request and checks the returned plan", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      subscription: { businessId: "biz-1", plan: "PRO", status: "ACTIVE" },
      entitlements: { plan: "PRO" },
    }), { status: 201 }))
    await expect(changePlanThroughApi(input, request)).resolves.toMatchObject({ plan: "PRO" })
    const [url, options] = request.mock.calls[0]
    expect(String(url)).toBe("http://localhost:3000/api/subscription")
    expect(options.headers["x-billing-internal-secret"]).toBe("local-secret")
    expect(options.headers["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/)
    expect(JSON.parse(options.body)).toEqual({ businessId: "biz-1", action: "set_plan", plan: "PRO", billingInterval: "MONTHLY" })
  })

  it("rejects a success response that does not confirm the target account and plan", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      subscription: { businessId: "other-business", plan: "PRO", status: "ACTIVE" },
      entitlements: { plan: "PRO" },
    }), { status: 201 }))
    await expect(changePlanThroughApi(input, request)).rejects.toBeInstanceOf(PlanApiError)
  })

  it("reports API rejections without including the secret", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Operación interna requerida" }), { status: 400 }))
    await expect(changePlanThroughApi(input, request)).rejects.toThrow("Operación interna requerida (HTTP 400)")
  })
})
