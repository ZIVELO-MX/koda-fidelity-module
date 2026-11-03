export type AccountPlan = "LITE" | "PRO"
export type PlanChangeEvent = { id: string; metadata: unknown; createdAt?: Date | string }

function planAtEvent(event: PlanChangeEvent): AccountPlan | null {
  if (!event.metadata || typeof event.metadata !== "object" || Array.isArray(event.metadata)) return null
  const record = event.metadata as Record<string, unknown>
  const explicit = record.effectivePlan
  if (explicit === "LITE" || explicit === "PRO") return explicit
  const plan = record.plan
  if (plan !== "LITE" && plan !== "PRO") return null
  if (plan === "LITE" && typeof record.proTrialEndsAt === "string" && event.createdAt) {
    const trialEndsAt = Date.parse(record.proTrialEndsAt)
    const createdAt = event.createdAt instanceof Date ? event.createdAt.getTime() : Date.parse(event.createdAt)
    if (Number.isFinite(trialEndsAt) && Number.isFinite(createdAt) && trialEndsAt > createdAt) return "PRO"
  }
  return plan
}

export function planChangeForEvent(events: PlanChangeEvent[], eventId: string, expectedPlan?: AccountPlan) {
  const index = events.findIndex((event) => event.id === eventId)
  if (index < 0) return null
  const event = events[index]
  const explicit = planChangeFromMetadata(event.metadata, expectedPlan)
  if (explicit) return explicit

  const to = planAtEvent(event)
  if (!to || (expectedPlan && to !== expectedPlan)) return null
  const metadata = event.metadata as Record<string, unknown>
  const explicitFrom = metadata.previousPlan
  const from = explicitFrom === "LITE" || explicitFrom === "PRO"
    ? explicitFrom
    : events.slice(index + 1).map(planAtEvent).find((plan): plan is AccountPlan => plan !== null)
  return from && from !== to ? { from, to } : null
}

export function planChangeFromMetadata(
  metadata: unknown,
  expectedPlan?: AccountPlan,
): { from: AccountPlan; to: AccountPlan } | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null

  const record = metadata as Record<string, unknown>
  const from = record.previousPlan
  const to = record.effectivePlan
  if ((from !== "LITE" && from !== "PRO") || (to !== "LITE" && to !== "PRO")) return null
  if (from === to || (expectedPlan && expectedPlan !== to)) return null
  return { from, to }
}

export function latestPlanChangeNotice(events: PlanChangeEvent[], currentPlan: AccountPlan | null) {
  if (!currentPlan) return null
  for (const event of events) {
    const change = planChangeForEvent(events, event.id, currentPlan)
    if (change) return { eventId: event.id, ...change }
  }
  return null
}
