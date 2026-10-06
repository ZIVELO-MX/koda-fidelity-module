import { describe, expect, it, vi } from "vitest"
import { changePlanThroughApi, confirmAndSendManualPlanChangeNotice, parsePlan, PlanApiError, sendManualPlanChangeNotice } from "./fidelity-admin-plan"

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

  const notice = {
    businessId: "biz-1", sourceEventId: "audit-original", previousPlan: "PRO" as const,
    effectivePlan: "LITE" as const, businessName: "Mi negocio", currentEffectivePlan: "LITE",
    baseUrl: "http://localhost:3000", secret: "local-secret",
  }

  it("sends a manual notice through the API without changing the subscription", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ event: {
      id: "notice-1", businessId: "biz-1", action: "manual_plan_change_notice", operator: "Raúl",
      metadata: { previousPlan: "PRO", effectivePlan: "LITE", sourceEventId: "audit-original" },
    } }), { status: 201 }))
    await expect(sendManualPlanChangeNotice({ ...notice, summary: "Cambio previo", operator: "Raúl" }, request)).resolves.toMatchObject({ id: "notice-1" })
    const [url, options] = request.mock.calls[0]
    expect(String(url)).toBe("http://localhost:3000/api/subscription/plan-change-notice")
    expect(JSON.parse(options.body)).toEqual({
      businessId: "biz-1", sourceEventId: "audit-original", previousPlan: "PRO", effectivePlan: "LITE", summary: "Cambio previo",
    })
    expect(options.headers["x-operator"]).toBe("Raúl")
  })

  it("does not call the API when the operator cancels confirmation", async () => {
    const ask = vi.fn().mockResolvedValueOnce("Cambio previo").mockResolvedValueOnce("Raúl").mockResolvedValueOnce("NO")
    const log = vi.fn()
    const request = vi.fn()
    await expect(confirmAndSendManualPlanChangeNotice(notice, ask, log, request)).resolves.toBeNull()
    expect(ask).toHaveBeenCalledWith("Escribe AVISAR para registrar el aviso: ")
    expect(log).toHaveBeenCalledWith("Aviso cancelado")
    expect(request).not.toHaveBeenCalled()
  })

  it("rejects a notice whose destination differs from the current effective plan before prompting", async () => {
    const ask = vi.fn()
    await expect(confirmAndSendManualPlanChangeNotice({ ...notice, currentEffectivePlan: "PRO" }, ask, vi.fn(), vi.fn())).rejects.toBeInstanceOf(PlanApiError)
    expect(ask).not.toHaveBeenCalled()
  })
})
