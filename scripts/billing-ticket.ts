import "dotenv/config"
import { prisma } from "../lib/prisma"
import { completeSubscriptionRequest, getSubscriptionRequestByTicket } from "../lib/subscription-requests"

const [action, ticketNumber, ...extra] = process.argv.slice(2)

async function main() {
  if (!ticketNumber || extra.length || !["show", "complete"].includes(action)) {
    console.error("Uso: pnpm billing:ticket -- show|complete <folio>")
    process.exitCode = 2
    return
  }
  const ticket = await getSubscriptionRequestByTicket(prisma, ticketNumber)
  if (!ticket) throw new Error("Folio no encontrado")
  if (action === "show") {
    console.log(JSON.stringify({
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      businessId: ticket.business.id,
      businessName: ticket.business.name,
      contactEmail: ticket.requestedByUser.email,
      plan: ticket.plan,
      billingInterval: ticket.billingInterval,
      createdAt: ticket.createdAt,
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
