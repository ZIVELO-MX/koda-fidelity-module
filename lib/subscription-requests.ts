import { randomBytes } from "node:crypto"
import { Prisma, PrismaClient } from "@prisma/client"
import { z } from "zod"
import { ConflictError, NotFoundError, ValidationError } from "@/lib/api-utils"

export const subscriptionRequestInputSchema = z.object({
  plan: z.enum(["LITE", "PRO"]),
  billingInterval: z.enum(["MONTHLY", "ANNUAL"]),
}).strict()

export type SubscriptionRequestInput = z.infer<typeof subscriptionRequestInputSchema>

type Db = PrismaClient

const newTicketNumber = () => `KF-${randomBytes(8).toString("hex").toUpperCase()}`
const uniqueViolation = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"

/** One pending request per business. The database partial unique index closes create races. */
export async function saveSubscriptionRequest(db: Db, input: SubscriptionRequestInput & { businessId: string; requestedByUserId: string }) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const pending = await db.subscriptionRequest.findFirst({ where: { businessId: input.businessId, status: "PENDING" } })
    if (pending) {
      if (pending.plan === input.plan && pending.billingInterval === input.billingInterval) return { request: pending, created: false }
      const activated = await db.billingAuditEvent.findUnique({ where: { idempotencyKey: `ticket:${pending.ticketNumber}` }, select: { id: true } })
      if (activated) throw new ConflictError("La solicitud ya fue activada; contacta a soporte para cambiar el plan")
      const updated = await db.subscriptionRequest.updateMany({
        where: { id: pending.id, status: "PENDING" },
        data: { plan: input.plan, billingInterval: input.billingInterval, requestedByUserId: input.requestedByUserId },
      })
      if (updated.count === 1) {
        return { request: await db.subscriptionRequest.findUniqueOrThrow({ where: { id: pending.id } }), created: false }
      }
      continue
    }
    try {
      const request = await db.subscriptionRequest.create({
        data: { ticketNumber: newTicketNumber(), businessId: input.businessId, requestedByUserId: input.requestedByUserId, plan: input.plan, billingInterval: input.billingInterval },
      })
      return { request, created: true }
    } catch (error) {
      if (!uniqueViolation(error)) throw error
    }
  }
  throw new ConflictError("No fue posible guardar la solicitud; inténtalo de nuevo")
}

export function getLatestSubscriptionRequest(db: Db, businessId: string) {
  return db.subscriptionRequest.findFirst({
    where: { businessId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { requestedByUser: { select: { email: true } } },
  })
}

export function getSubscriptionRequestByTicket(db: Db, ticketNumber: string) {
  return db.subscriptionRequest.findUnique({
    where: { ticketNumber },
    include: { business: { select: { id: true, name: true } }, requestedByUser: { select: { email: true } } },
  })
}

export async function completeSubscriptionRequest(db: Db, ticketNumber: string, operator: string) {
  if (!operator.trim()) throw new ValidationError("Identifica al operador que atendió el folio")
  const request = await getSubscriptionRequestByTicket(db, ticketNumber)
  if (!request) throw new NotFoundError("Folio no encontrado")
  if (request.status === "COMPLETED") return request
  const [subscription, audit] = await Promise.all([
    db.subscription.findFirst({ where: { businessId: request.businessId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } }),
    db.billingAuditEvent.findUnique({ where: { idempotencyKey: `ticket:${ticketNumber}` } }),
  ])
  if (subscription?.plan !== request.plan || subscription.billingInterval !== request.billingInterval || audit?.businessId !== request.businessId) {
    throw new ConflictError("Activa primero el plan y la modalidad solicitados usando la clave del folio")
  }
  const updated = await db.subscriptionRequest.updateMany({
    where: { id: request.id, status: "PENDING" },
    data: { status: "COMPLETED", completedAt: new Date(), completedBy: operator.trim() },
  })
  if (updated.count !== 1) throw new ConflictError("La solicitud cambió; vuelve a consultar el folio")
  return (await getSubscriptionRequestByTicket(db, ticketNumber))!
}
