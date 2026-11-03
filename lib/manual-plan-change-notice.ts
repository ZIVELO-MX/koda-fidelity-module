import { Prisma, type PrismaClient } from "@prisma/client"
import { ConflictError, NotFoundError, ValidationError } from "@/lib/api-utils"
import { resolveEffectiveEntitlements } from "@/lib/account-lifecycle"
import { planChangeFromMetadata, type AccountPlan } from "@/lib/plan-change-notice"

type ReadDb = PrismaClient | Prisma.TransactionClient

export type ManualPlanChangeNoticeCandidate = {
  businessId: string
  sourceEventId: string
  previousPlan: AccountPlan
  effectivePlan: AccountPlan
}

const subscriptionActions = ["activate", "renew", "set_plan"]

/** Read-only preview. The mutation repeats these checks inside its transaction. */
export async function previewManualPlanChangeNotice(db: ReadDb, businessId: string, now = new Date()): Promise<ManualPlanChangeNoticeCandidate> {
  const current = await db.subscription.findFirst({
    where: { businessId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  })
  if (!current) throw new NotFoundError("El negocio no tiene una suscripción activa")

  const effectivePlan = resolveEffectiveEntitlements(current, now).plan as AccountPlan
  let source: { id: string; metadata: unknown } | null = null
  let previousPlan: AccountPlan | null = null

  if (effectivePlan === "LITE" && current.proTrialEndsAt && current.proTrialEndsAt <= now && !current.proAccessGranted) {
    source = await db.billingAuditEvent.findFirst({
      where: { businessId, action: "expire_pro_trial", createdAt: { gte: current.createdAt } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, metadata: true },
    })
    if (source) previousPlan = "PRO"
  }

  if (!source) {
    const history = await db.subscription.findMany({
      where: { businessId, createdAt: { lte: current.createdAt } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    })
    const currentIndex = history.findIndex((subscription) => subscription.id === current.id)
    for (let index = currentIndex; index >= 0 && index < history.length - 1; index++) {
      const newer = history[index]
      const older = history[index + 1]
      const to = resolveEffectiveEntitlements(newer, newer.createdAt).plan as AccountPlan
      const from = resolveEffectiveEntitlements(older, newer.createdAt).plan as AccountPlan
      if (to !== effectivePlan) break
      if (from === to) continue

      source = await db.billingAuditEvent.findFirst({
        where: {
          businessId,
          action: { in: subscriptionActions },
          createdAt: { gte: newer.createdAt, ...(index > currentIndex ? { lt: history[index - 1].createdAt } : {}) },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, metadata: true },
      })
      if (!source) throw new ConflictError("No hay una auditoría del cambio de plan")
      const metadata = source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
        ? source.metadata as Record<string, unknown>
        : {}
      if (metadata.plan !== newer.plan) throw new ConflictError("La auditoría no corresponde a la suscripción")
      previousPlan = from
      break
    }
  }
  if (!source || !previousPlan) throw new ConflictError("No hay un cambio efectivo pendiente de aviso")
  if (planChangeFromMetadata(source.metadata)) throw new ConflictError("El cambio ya tiene una transición registrada")

  const idempotencyKey = `manual-plan-change-notice:${source.id}`
  if (await db.billingAuditEvent.findUnique({ where: { idempotencyKey }, select: { id: true } })) {
    throw new ConflictError("Este cambio ya tiene un aviso manual")
  }
  return { businessId, sourceEventId: source.id, previousPlan, effectivePlan }
}

export async function issueManualPlanChangeNotice(db: PrismaClient, input: ManualPlanChangeNoticeCandidate & { summary: string; operator: string }) {
  const summary = input.summary.trim()
  const operator = input.operator.trim()
  if (!summary) throw new ValidationError("Escribe el resumen del aviso")
  if (!operator) throw new ValidationError("Identifica a quien emite el aviso")

  try {
    return await db.$transaction(async (tx) => {
      const current = await previewManualPlanChangeNotice(tx, input.businessId)
      if (current.sourceEventId !== input.sourceEventId || current.previousPlan !== input.previousPlan || current.effectivePlan !== input.effectivePlan) {
        throw new ConflictError("La suscripción o su auditoría cambió; vuelve a consultar la cuenta")
      }
      return tx.billingAuditEvent.create({
        data: {
          businessId: input.businessId,
          action: "manual_plan_change_notice",
          operator,
          idempotencyKey: `manual-plan-change-notice:${current.sourceEventId}`,
          metadata: {
            previousPlan: current.previousPlan,
            effectivePlan: current.effectivePlan,
            summary,
            sourceEventId: current.sourceEventId,
          },
        },
      })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("Este cambio ya tiene un aviso manual")
    }
    throw error
  }
}
