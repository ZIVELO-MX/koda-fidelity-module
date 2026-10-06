import type { PrismaClient } from "@prisma/client"
import { resolve } from "node:path"

export type FidelityAdminReadClient = {
  user: Pick<PrismaClient["user"], "findFirst">
  business: Pick<PrismaClient["business"], "findUnique">
  loyaltyCard: Pick<PrismaClient["loyaltyCard"], "groupBy">
  subscriptionRequest: Pick<PrismaClient["subscriptionRequest"], "findMany">
}

export type FidelityEnvironment = "development" | "production"

export function parseFidelityEnvironment(value: string): FidelityEnvironment {
  const normalized = value.trim().toLowerCase()
  if (["development", "dev", "desarrollo"].includes(normalized)) return "development"
  if (["production", "prod", "produccion"].includes(normalized)) return "production"
  throw new Error("Entorno inválido. Elige DESARROLLO o PRODUCCION")
}

export function fidelityEnvFile(environment: FidelityEnvironment, cwd: string) {
  const file = environment === "development" ? ".env.development.local" : ".env.production.local"
  return resolve(cwd, file)
}

export function databaseHost(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl)
    return `${url.hostname}${url.port ? `:${url.port}` : ""}`
  } catch {
    throw new Error("DATABASE_URL no contiene una URL válida")
  }
}

export type AdminLookupResult =
  | { kind: "not_found"; email: string }
  | { kind: "not_admin"; email: string; name: string; role: string }
  | { kind: "onboarding"; email: string; name: string; step: string | null; status: string | null; updatedAt: Date | null }
  | {
      kind: "business"
      admin: { email: string; name: string }
      business: { id: string; name: string; email: string; createdAt: Date }
      members: Array<{ name: string; email: string; role: string }>
      invitations: Array<{ name: string; email: string; role: string; expiresAt: Date }>
      subscription: {
        status: string
        plan: string
        billingInterval: string
        periodStart: Date
        periodEnd: Date
        proTrialEndsAt: Date | null
        proAccessGranted: boolean
      } | null
      effectivePlan: string
      cardCounts: Record<"ACTIVE" | "DRAFT" | "LOCKED_BY_PLAN" | "ARCHIVED", number>
      pendingRequests: Array<{ ticketNumber: string; plan: string; billingInterval: string; createdAt: Date }>
    }

export async function queryAdminAccount(db: FidelityAdminReadClient, rawEmail: string, now = new Date()): Promise<AdminLookupResult> {
  const email = rawEmail.trim().toLowerCase()
  const account = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      email: true,
      name: true,
      role: true,
      businessId: true,
      onboardingProgress: { select: { step: true, status: true, updatedAt: true } },
    },
  })

  if (!account) return { kind: "not_found", email }
  if (account.role !== "admin") return { kind: "not_admin", email: account.email, name: account.name, role: account.role }
  if (!account.businessId) {
    return {
      kind: "onboarding",
      email: account.email,
      name: account.name,
      step: account.onboardingProgress?.step ?? null,
      status: account.onboardingProgress?.status ?? null,
      updatedAt: account.onboardingProgress?.updatedAt ?? null,
    }
  }

  const business = await db.business.findUnique({
    where: { id: account.businessId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      users: { select: { name: true, email: true, role: true }, orderBy: [{ role: "asc" }, { name: "asc" }] },
      invitations: {
        where: { status: "pending", expiresAt: { gt: now } },
        select: { name: true, email: true, role: true, expiresAt: true },
        orderBy: { createdAt: "asc" },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, plan: true, billingInterval: true, periodStart: true, periodEnd: true, proTrialEndsAt: true, proAccessGranted: true },
      },
    },
  })
  if (!business) throw new Error("El negocio asociado al admin no existe")

  const cardGroups = await db.loyaltyCard.groupBy({
    by: ["status"],
    where: { businessId: business.id },
    _count: { _all: true },
  })
  const pendingRequests = await db.subscriptionRequest.findMany({
    where: { businessId: business.id, status: "PENDING" },
    select: { ticketNumber: true, plan: true, billingInterval: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  const subscription = business.subscriptions[0] ?? null
  const proTrial = subscription?.plan === "LITE"
    && subscription.proAccessGranted
    && Boolean(subscription.proTrialEndsAt && subscription.proTrialEndsAt > now)
  const effectivePlan = subscription?.status !== "ACTIVE"
    ? "INACTIVO"
    : subscription.plan === "PRO" || proTrial ? "PRO" : "LITE"
  const cardCounts = { ACTIVE: 0, DRAFT: 0, LOCKED_BY_PLAN: 0, ARCHIVED: 0 }
  for (const group of cardGroups) cardCounts[group.status] = group._count._all

  return {
    kind: "business",
    admin: { email: account.email, name: account.name },
    business: { id: business.id, name: business.name, email: business.email, createdAt: business.createdAt },
    members: business.users,
    invitations: business.invitations,
    subscription,
    effectivePlan,
    cardCounts,
    pendingRequests,
  }
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "sin fecha"
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "America/Mexico_City" }).format(value)
}

export function formatAdminLookup(result: AdminLookupResult) {
  if (result.kind === "not_found") return `No encontramos un admin con el correo ${result.email}.`
  if (result.kind === "not_admin") return `${result.email} pertenece a ${result.name} (rol ${result.role}), no a un admin.`
  if (result.kind === "onboarding") {
    return [
      "Admin sin negocio vinculado",
      `  ${result.name} <${result.email}>`,
      `  Onboarding: ${result.step ?? "sin progreso"} · ${result.status ?? "sin estado"}`,
      `  Última actualización: ${formatDate(result.updatedAt)}`,
    ].join("\n")
  }

  const { business, subscription } = result
  const showProTrial = subscription?.plan === "LITE" && subscription.proAccessGranted && subscription.proTrialEndsAt
  const subscriptionLine = subscription
    ? `  Acceso efectivo: ${result.effectivePlan} · suscripción ${subscription.status} (${subscription.plan}/${subscription.billingInterval}) · periodo ${formatDate(subscription.periodStart)}–${formatDate(subscription.periodEnd)}${showProTrial ? ` · trial Pro hasta ${formatDate(subscription.proTrialEndsAt)}` : ""}`
    : "  Acceso efectivo: INACTIVO · sin suscripción"
  const lines = [
    "Consulta de Fidelity",
    `Admin: ${result.admin.name} <${result.admin.email}>`,
    `Negocio: ${business.name} (${business.id})`,
    `Correo del negocio: ${business.email}`,
    `Alta del negocio: ${formatDate(business.createdAt)}`,
    subscriptionLine,
    `Miembros (${result.members.length}):`,
    ...result.members.map((member) => `  - ${member.name} <${member.email}> · ${member.role}`),
    `Invitaciones pendientes (${result.invitations.length}):`,
    ...result.invitations.map((invite) => `  - ${invite.name} <${invite.email}> · ${invite.role} · vence ${formatDate(invite.expiresAt)}`),
    `Tarjetas: ${result.cardCounts.ACTIVE} activas, ${result.cardCounts.DRAFT} borradores, ${result.cardCounts.LOCKED_BY_PLAN} bloqueadas, ${result.cardCounts.ARCHIVED} archivadas`,
    `Solicitudes de activación pendientes (${result.pendingRequests.length}):`,
    ...result.pendingRequests.map((request) => `  - ${request.ticketNumber} · ${request.plan}/${request.billingInterval} · ${formatDate(request.createdAt)}`),
  ]
  return lines.join("\n")
}
