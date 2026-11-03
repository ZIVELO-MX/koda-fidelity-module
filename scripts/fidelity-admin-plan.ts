import { randomUUID } from "node:crypto"
import type { ManualPlanChangeNoticeCandidate } from "../lib/manual-plan-change-notice"

export type Plan = "LITE" | "PRO"

export class PlanApiError extends Error {}

function apiUrl(baseUrl: string, path: string) {
  const url = new URL(path, baseUrl)
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new PlanApiError("La API debe usar HTTPS")
  }
  return url
}

async function apiError(response: Response) {
  let message = "La API rechazó la operación"
  try {
    const body = await response.json() as { error?: unknown }
    if (typeof body.error === "string") message = body.error
  } catch { /* The status still identifies the failed request. */ }
  return new PlanApiError(`${message} (HTTP ${response.status})`)
}

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
  periodStart: Date
  periodEnd: Date
  operator: string
}, request: typeof fetch = fetch) {
  const url = apiUrl(input.baseUrl, "/api/subscription")
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
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    }),
  })
  if (!response.ok) throw await apiError(response)
  const body = await response.json() as {
    subscription?: { businessId?: string; plan?: string; status?: string }
    entitlements?: { plan?: string }
  }
  if (body.subscription?.businessId !== input.businessId || body.subscription.plan !== input.plan || body.subscription.status !== "ACTIVE" || body.entitlements?.plan !== input.plan) {
    throw new PlanApiError("La API respondió sin confirmar el plan solicitado")
  }
  return body.subscription
}

export async function sendManualPlanChangeNotice(
  input: ManualPlanChangeNoticeCandidate & { baseUrl: string; secret: string; summary: string; operator: string },
  request: typeof fetch = fetch,
) {
  const response = await request(apiUrl(input.baseUrl, "/api/subscription/plan-change-notice"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-billing-internal-secret": input.secret,
      "x-operator": input.operator,
    },
    body: JSON.stringify({
      businessId: input.businessId,
      sourceEventId: input.sourceEventId,
      previousPlan: input.previousPlan,
      effectivePlan: input.effectivePlan,
      summary: input.summary,
    }),
  })
  if (!response.ok) throw await apiError(response)
  const body = await response.json() as {
    event?: { id?: string; businessId?: string; action?: string; operator?: string; metadata?: { previousPlan?: string; effectivePlan?: string; sourceEventId?: string } }
  }
  if (!body.event?.id || body.event.businessId !== input.businessId || body.event.action !== "manual_plan_change_notice"
    || body.event.operator !== input.operator || body.event.metadata?.previousPlan !== input.previousPlan
    || body.event.metadata?.effectivePlan !== input.effectivePlan || body.event.metadata?.sourceEventId !== input.sourceEventId) {
    throw new PlanApiError("La API respondió sin confirmar el aviso solicitado")
  }
  return body.event
}

export async function confirmAndSendManualPlanChangeNotice(
  input: ManualPlanChangeNoticeCandidate & { businessName: string; currentEffectivePlan: string; baseUrl: string; secret: string },
  ask: (label: string) => Promise<string>,
  log: (message: string) => void,
  request: typeof fetch = fetch,
) {
  if (input.effectivePlan !== input.currentEffectivePlan) throw new PlanApiError("El plan efectivo cambió; vuelve a consultar la cuenta")
  const summary = (await ask("Resumen del aviso: ")).trim()
  if (!summary) throw new PlanApiError("Escribe el resumen del aviso")
  const operator = (await ask("Nombre o correo de quien emite el aviso: ")).trim()
  if (!operator) throw new PlanApiError("Identifica a quien emite el aviso")
  log(`Aviso: ${input.businessName} (${input.businessId}) · ${input.previousPlan} → ${input.effectivePlan} · auditoría ${input.sourceEventId}`)
  log(`Resumen: ${summary} · Emitido por: ${operator}`)
  if ((await ask("Escribe AVISAR para registrar el aviso: ")).trim() !== "AVISAR") {
    log("Aviso cancelado")
    return null
  }
  return sendManualPlanChangeNotice({ ...input, summary, operator }, request)
}
