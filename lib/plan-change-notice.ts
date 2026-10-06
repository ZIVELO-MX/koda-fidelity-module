export type AccountPlan = "LITE" | "PRO"
export type PlanChangeEvent = { id: string; metadata: unknown }

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
    const change = planChangeFromMetadata(event.metadata, currentPlan)
    if (change) return { eventId: event.id, ...change }
  }
  return null
}
