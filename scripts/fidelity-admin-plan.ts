import { randomUUID } from "node:crypto"

export type Plan = "LITE" | "PRO"

export class PlanApiError extends Error {}

export function parsePlan(value: string): Plan {
  const plan = value.trim().toUpperCase()
  if (plan !== "LITE" && plan !== "PRO") throw new Error("Elige LITE o PRO")
  return plan
}

export async function changePlanThroughApi(input: {
  baseUrl: string
  secret: string
  businessId: string
  plan: Plan
  billingInterval: "MONTHLY" | "ANNUAL"
  operator: string
}, request: typeof fetch = fetch) {
  const url = new URL("/api/subscription", input.baseUrl)
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("La API debe usar HTTPS")
  }
  const response = await request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-billing-internal-secret": input.secret,
      "x-operator": input.operator,
      "idempotency-key": randomUUID(),
    },
    body: JSON.stringify({
      businessId: input.businessId,
      action: "set_plan",
      plan: input.plan,
      billingInterval: input.billingInterval,
    }),
  })
  if (!response.ok) {
    let message = "La API rechazó el cambio de plan"
    try {
      const body = await response.json() as { error?: unknown }
      if (typeof body.error === "string") message = body.error
    } catch { /* The status still identifies the failed request. */ }
    throw new PlanApiError(`${message} (HTTP ${response.status})`)
  }
  const body = await response.json() as {
    subscription?: { businessId?: string; plan?: string; status?: string }
    entitlements?: { plan?: string }
  }
  if (body.subscription?.businessId !== input.businessId || body.subscription.plan !== input.plan || body.subscription.status !== "ACTIVE" || body.entitlements?.plan !== input.plan) {
    throw new PlanApiError("La API respondió sin confirmar el plan solicitado")
  }
  return body.subscription
}
