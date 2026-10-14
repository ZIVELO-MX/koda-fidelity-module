import "dotenv/config"
import { prisma } from "../lib/prisma"
import { completeSubscriptionRequest, getSubscriptionRequestByTicket } from "../lib/subscription-requests"

const args = process.argv.slice(2)
if (args[0] === "--") args.shift()
const [action, ticketNumber, ...extra] = args

async function main() {
  if (!ticketNumber || extra.length || !["show", "complete"].includes(action)) {
    console.error("Uso: pnpm billing:ticket -- show|complete <folio>")
    process.exitCode = 2
    return
  }
  const ticket = await getSubscriptionRequestByTicket(prisma, ticketNumber)
  if (!ticket) throw new Error("Folio no encontrado")
  if (action === "show") {
    const [subscription, activationAudit] = await Promise.all([
      prisma.subscription.findFirst({
        where: { businessId: ticket.business.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: { id: true, plan: true, billingInterval: true, periodStart: true, periodEnd: true, proTrialEndsAt: true },
      }),
      prisma.billingAuditEvent.findUnique({
        where: { idempotencyKey: `ticket:${ticket.ticketNumber}` },
        select: { businessId: true, operator: true },
      }),
    ])
    console.log(JSON.stringify({
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      businessId: ticket.business.id,
      businessName: ticket.business.name,
      contactEmail: ticket.requestedByUser.email,
      plan: ticket.plan,
      billingInterval: ticket.billingInterval,
      createdAt: ticket.createdAt,
      subscription,
      activationRecorded: activationAudit?.businessId === ticket.business.id,
      activationMatchesRequest: activationAudit?.businessId === ticket.business.id
        && subscription?.plan === ticket.plan && subscription.billingInterval === ticket.billingInterval,
      activationOperator: activationAudit?.operator ?? null,
      activationCommand: ticket.status === "PENDING"
        ? `pnpm billing:set-plan --business-id ${ticket.business.id} --plan ${ticket.plan} --interval ${ticket.billingInterval} --idempotency-key ticket:${ticket.ticketNumber}`
        : null,
    }))
    return
  }
  const operator = process.env.BILLING_OPERATOR?.trim()
  if (!operator) throw new Error("BILLING_OPERATOR es obligatorio para cerrar un ticket")
  const completed = await completeSubscriptionRequest(prisma, ticketNumber, operator)
  console.log(JSON.stringify({ ticketNumber: completed.ticketNumber, status: completed.status, completedAt: completed.completedAt, completedBy: completed.completedBy }))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "No fue posible operar el folio")
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
