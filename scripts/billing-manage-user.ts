import "dotenv/config"
import { randomUUID } from "node:crypto"
import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { prisma } from "../lib/prisma"
import {
  activateManualSubscription,
  deactivateManualSubscription,
} from "../lib/account-lifecycle"
import { completeSubscriptionRequest, saveSubscriptionRequest } from "../lib/subscription-requests"

type RequestedPlan = "PRO" | "LITE" | "INACTIVO"

const readline = createInterface({ input, output })
const operator = process.env.BILLING_OPERATOR?.trim()

async function ask(label: string) {
  return (await readline.question(label)).trim()
}

function isRequestedPlan(value: string): value is RequestedPlan {
  return value === "PRO" || value === "LITE" || value === "INACTIVO"
}

async function main() {
  if (!operator) throw new Error("Define BILLING_OPERATOR con el nombre de quien ejecuta el cambio")

  const email = (await ask("Correo de un usuario del negocio: ")).toLowerCase()
  if (!email || !email.includes("@")) throw new Error("Escribe un correo válido")

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, name: true, role: true, businessId: true },
  })
  if (!user?.businessId) {
    const invitations = await prisma.teamInvitation.findMany({
      where: { email: { equals: email, mode: "insensitive" }, status: "pending", expiresAt: { gt: new Date() } },
      include: { business: { select: { name: true } } },
      take: 2,
    })
    if (invitations.length) {
      const negocios = invitations.map((invite) => invite.business.name).join(", ")
      throw new Error(`Ese correo solo tiene una invitación pendiente (${negocios}). Usa el correo de un usuario ya vinculado; el plan pertenece al negocio completo.`)
    }
    throw new Error("No encontramos un usuario asociado a un negocio con ese correo")
  }

  const [business, pendingRequests, cardCounts, subscriptionCount] = await Promise.all([
    prisma.business.findUnique({
      where: { id: user.businessId },
      include: {
        users: { select: { name: true, email: true, role: true }, orderBy: [{ role: "asc" }, { name: "asc" }] },
        invitations: {
          where: { status: "pending", expiresAt: { gt: new Date() } },
          select: { name: true, email: true, role: true, expiresAt: true },
          orderBy: { createdAt: "asc" },
        },
        subscriptions: { select: { id: true, plan: true, billingInterval: true, status: true, periodEnd: true, proAccessGranted: true, proTrialEndsAt: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.subscriptionRequest.findMany({ where: { businessId: user.businessId, status: "PENDING" }, select: { ticketNumber: true, plan: true, billingInterval: true } }),
    prisma.loyaltyCard.groupBy({ by: ["status"], where: { businessId: user.businessId }, _count: { _all: true } }),
    prisma.subscription.count({ where: { businessId: user.businessId } }),
  ])
  if (!business) throw new Error("El negocio asociado al usuario ya no existe")

  const activeSubscription = business.subscriptions.find((subscription) => subscription.status === "ACTIVE") ?? null
  const hasProTrial = activeSubscription?.plan === "LITE"
    && activeSubscription.proAccessGranted
    && Boolean(activeSubscription.proTrialEndsAt && activeSubscription.proTrialEndsAt > new Date())
  const effectivePlan: RequestedPlan = activeSubscription
    ? activeSubscription.plan === "PRO" || hasProTrial ? "PRO" : "LITE"
    : "INACTIVO"
  const cardCount = (status: string) => cardCounts.find((group) => group.status === status)?._count._all ?? 0

  console.log("\nNegocio afectado")
  console.log(`  ${business.name} (${business.id})`)
  console.log(`Usuario buscado: ${user.name} <${user.email}> · ${user.role}`)
  console.log(`Plan efectivo actual: ${effectivePlan}${activeSubscription ? ` · ${activeSubscription.billingInterval} · vence ${activeSubscription.periodEnd.toLocaleDateString("es-MX")}` : " · sin suscripción activa"}`)
  console.log(`Miembros vinculados (${business.users.length}):`)
  for (const member of business.users) console.log(`  - ${member.name} <${member.email}> · ${member.role}`)
  console.log(`Invitaciones pendientes (${business.invitations.length}):`)
  for (const invite of business.invitations) console.log(`  - ${invite.name} <${invite.email}> · ${invite.role}`)
  console.log(`Tarjetas: ${cardCount("ACTIVE")} activas, ${cardCount("LOCKED_BY_PLAN")} bloqueadas, ${cardCount("DRAFT")} borradores, ${cardCount("ARCHIVED")} archivadas`)
  if (pendingRequests.length) {
    console.log(`Solicitudes de activación pendientes: ${pendingRequests.map((request) => `${request.ticketNumber} (${request.plan}/${request.billingInterval})`).join(", ")}`)
  }

  const rawPlan = (await ask("Plan nuevo (PRO|LITE|INACTIVO): ")).toUpperCase()
  if (!isRequestedPlan(rawPlan)) throw new Error("Plan inválido. Usa PRO, LITE o INACTIVO")
  const summary = await ask("Resumen del cambio (se guardará en auditoría): ")
  if (!summary) throw new Error("El resumen es obligatorio")
  if (summary.length > 500) throw new Error("El resumen no puede exceder 500 caracteres")

  if (pendingRequests.length > 1 && rawPlan !== "INACTIVO") {
    throw new Error("Hay varias solicitudes pendientes; resuélvelas por folio antes de cambiar el plan")
  }
  const interval = pendingRequests[0]?.billingInterval ?? activeSubscription?.billingInterval ?? business.subscriptions[0]?.billingInterval ?? "MONTHLY"
  console.log("\nResumen para confirmar")
  console.log(`  Correo: ${email}`)
  console.log(`  Negocio: ${business.name} (${business.id})`)
  console.log(`  Usuarios afectados: ${business.users.length}; invitaciones pendientes: ${business.invitations.length}`)
  console.log("  El plan es del negocio: todos los miembros vinculados lo comparten y las invitaciones lo heredan al aceptarse.")
  console.log(`  Plan: ${effectivePlan} → ${rawPlan}`)
  console.log(`  Resumen: ${summary}`)
  if (rawPlan === "PRO") console.log(`  Efecto: activa Pro (${interval}), publica las tarjetas no archivadas y habilita a los miembros del negocio.`)
  if (rawPlan === "LITE") console.log(`  Efecto: activa Lite (${interval}); puede degradar temas Pro y limitar las tarjetas activas.${subscriptionCount === 0 ? " La primera activación Lite incluye un mes Pro." : ""}`)
  if (rawPlan === "INACTIVO") console.log("  Efecto: cancela suscripciones activas, bloquea todas las tarjetas no archivadas y deja a los miembros esperando activación. Las invitaciones siguen pendientes; quien las acepte también quedará bloqueado. No borra usuarios ni datos.")
  if (pendingRequests.length && rawPlan === "INACTIVO") console.log("  Nota: las solicitudes pendientes seguirán abiertas aunque el negocio quede inactivo; no las proceses sin revisar este cambio.")
  if (pendingRequests.length && rawPlan !== "INACTIVO") console.log(`  Folio: ${pendingRequests[0].ticketNumber} se ajustará al plan elegido y se cerrará después de activar.`)
  console.log(`  Operador: ${operator}`)

  const confirmation = await ask('Escribe "CONFIRMAR" para aplicar el cambio: ')
  if (confirmation !== "CONFIRMAR") {
    console.log("Sin cambios.")
    return
  }

  const idempotencyKey = `manual-user:${business.id}:${randomUUID()}`
  if (rawPlan === "INACTIVO") {
    const result = await deactivateManualSubscription(prisma, { businessId: business.id, summary, operator, idempotencyKey })
    console.log(JSON.stringify({ ...result, plan: "INACTIVO", operator }))
    return
  }

  const pendingRequest = pendingRequests[0]
  const plan = rawPlan
  let ticketNumber: string | undefined
  let billingInterval = interval
  if (pendingRequest) {
    ticketNumber = pendingRequest.ticketNumber
    billingInterval = pendingRequest.billingInterval
    await saveSubscriptionRequest(prisma, {
      businessId: business.id,
      requestedByUserId: user.id,
      plan,
      billingInterval,
    })
  }

  const action = subscriptionCount === 0 ? "activate" : "set_plan"
  const subscription = await activateManualSubscription(prisma, {
    businessId: business.id,
    plan,
    billingInterval,
    operator,
    action,
    summary,
    idempotencyKey: ticketNumber ? `ticket:${ticketNumber}` : idempotencyKey,
  })
  if (ticketNumber) await completeSubscriptionRequest(prisma, ticketNumber, operator)
  console.log(JSON.stringify({ businessId: business.id, plan, billingInterval, subscriptionId: subscription.id, status: subscription.status, ticketNumber: ticketNumber ?? null, operator }))
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "No se pudo cambiar el plan")
    process.exitCode = 1
  })
  .finally(async () => {
    readline.close()
    await prisma.$disconnect()
  })
