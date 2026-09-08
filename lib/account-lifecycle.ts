import { Prisma, PrismaClient, SubscriptionPlan } from "@prisma/client"
import { ConflictError, NotFoundError, ValidationError } from "@/lib/api-utils"
import { createAdminClient } from "@/lib/supabase-admin"

type Db = PrismaClient

export function normalizeProfileEmail(email: string) { return email.trim().toLowerCase() }

export function addCalendarMonths(date: Date, months: number) {
  const result = new Date(date)
  const day = result.getDate()
  result.setDate(1)
  result.setMonth(result.getMonth() + months)
  result.setDate(Math.min(day, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()))
  return result
}

export function periodForInterval(start: Date, interval: "MONTHLY" | "ANNUAL") { return addCalendarMonths(start, interval === "ANNUAL" ? 12 : 1) }

export async function activateManualSubscription(db: Db, input: { businessId: string; plan?: "LITE" | "PRO"; billingInterval?: "MONTHLY" | "ANNUAL"; amountMinor?: number; externalReference?: string; periodStart?: Date; periodEnd?: Date; proTrialEndsAt?: Date | null }) {
  const plan = input.plan ?? "LITE"
  const billingInterval = input.billingInterval ?? "MONTHLY"
  const periodStart = input.periodStart ?? new Date()
  const periodEnd = input.periodEnd ?? periodForInterval(periodStart, billingInterval)
  const proTrialEndsAt = input.proTrialEndsAt === undefined && plan === "LITE" ? periodForInterval(periodStart, "MONTHLY") : input.proTrialEndsAt ?? null
  if (periodEnd <= periodStart) throw new ValidationError("El periodo debe terminar después de iniciar")
  if (!await db.business.findUnique({ where: { id: input.businessId }, select: { id: true } })) throw new NotFoundError("Negocio no encontrado")
  return db.$transaction(async (tx) => {
    await tx.subscription.updateMany({ where: { businessId: input.businessId, status: "ACTIVE" }, data: { status: "CANCELED" } })
    const subscription = await tx.subscription.create({ data: { businessId: input.businessId, plan, billingInterval, amountMinor: input.amountMinor ?? 0, periodStart, periodEnd, externalReference: input.externalReference, proTrialEndsAt } })
    await applyEntitlements(tx, input.businessId, plan === "PRO" || Boolean(proTrialEndsAt && proTrialEndsAt > new Date()) ? "PRO" : "LITE")
    await tx.onboardingProgress.updateMany({ where: { businessId: input.businessId }, data: { status: "ACTIVE", step: "PAYWALL" } })
    return subscription
  })
}

export async function applyEntitlements(db: PrismaClient | Prisma.TransactionClient, businessId: string, plan: SubscriptionPlan) {
  const cards = await db.loyaltyCard.findMany({ where: { businessId }, orderBy: { createdAt: "asc" } })
  if (plan === "PRO") { await db.loyaltyCard.updateMany({ where: { businessId }, data: { isActive: true, isLite: false } }); return cards }
  const keep = cards.find((card) => card.isLite) ?? cards[0]
  if (!keep) return cards
  await db.loyaltyCard.updateMany({ where: { businessId }, data: { isActive: false, isLite: false } })
  await db.loyaltyCard.update({ where: { id: keep.id }, data: { isActive: true, isLite: true } })
  return [keep]
}

export async function getEntitlements(db: Db, businessId: string, now = new Date()) {
  const subscription = await db.subscription.findFirst({ where: { businessId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } })
  const trial = Boolean(subscription?.proTrialEndsAt && subscription.proTrialEndsAt > now)
  return { plan: trial ? "PRO" : (subscription?.plan ?? "LITE"), billingInterval: subscription?.billingInterval ?? null, subscription, trial }
}

export async function syncExpiredEntitlements(db: Db, businessId: string, now = new Date()) {
  const entitlements = await getEntitlements(db, businessId, now)
  await applyEntitlements(db, businessId, entitlements.plan as SubscriptionPlan)
  return entitlements
}

export async function createCustomerProfile(db: Db, input: { businessId: string; authUserId?: string | null; email: string; name: string; avatarPath?: string | null }) {
  const emailKey = normalizeProfileEmail(input.email)
  if (!emailKey || !emailKey.includes("@") || !input.name.trim()) throw new ValidationError("Perfil de cliente inválido")
  const existing = await db.customerProfile.findUnique({ where: { businessId_emailKey: { businessId: input.businessId, emailKey } } })
  if (existing && input.authUserId && existing.authUserId && existing.authUserId !== input.authUserId) throw new ConflictError("El correo ya pertenece a otro perfil")
  if (existing) return db.customerProfile.update({ where: { id: existing.id }, data: { name: input.name.trim(), authUserId: input.authUserId ?? existing.authUserId, avatarPath: input.avatarPath === undefined ? existing.avatarPath : input.avatarPath } })
  if (input.authUserId) {
    const byAuth = await db.customerProfile.findUnique({ where: { businessId_authUserId: { businessId: input.businessId, authUserId: input.authUserId } } })
    if (byAuth && byAuth.emailKey !== emailKey) throw new ConflictError("La identidad ya pertenece a otro perfil")
  }
  return db.customerProfile.create({ data: { businessId: input.businessId, authUserId: input.authUserId ?? null, email: input.email.trim(), emailKey, name: input.name.trim(), avatarPath: input.avatarPath ?? null } })
}

export async function scheduleClosure(db: Db, businessId: string, now = new Date()) {
  const scheduledFor = addCalendarMonths(now, 1)
  await db.accountClosure.updateMany({ where: { businessId, status: "SCHEDULED" }, data: { status: "CANCELED", canceledAt: now } })
  return db.accountClosure.create({ data: { businessId, scheduledFor } })
}

export async function cancelClosure(db: Db, businessId: string) { return db.accountClosure.updateMany({ where: { businessId, status: "SCHEDULED" }, data: { status: "CANCELED", canceledAt: new Date() } }) }

export async function previewClosure(db: Db, businessId: string) {
  const [business, cards, customers, closure] = await Promise.all([
    db.business.findUnique({ where: { id: businessId }, select: { id: true, name: true } }),
    db.loyaltyCard.count({ where: { businessId } }),
    db.customer.count({ where: { card: { businessId } } }),
    db.accountClosure.findFirst({ where: { businessId, status: "SCHEDULED" }, orderBy: { scheduledFor: "asc" } }),
  ])
  if (!business) throw new NotFoundError("Negocio no encontrado")
  return { business, cards, customers, scheduledClosure: closure }
}

export async function registerBusinessAvatar(db: Db, businessId: string, storagePath: string) {
  if (!storagePath.trim()) throw new ValidationError("Ruta de avatar requerida")
  return db.businessAvatarAsset.create({ data: { businessId, storagePath: storagePath.trim() } })
}

export async function cleanupBusinessAvatar(db: Db, assetId: string) {
  const asset = await db.businessAvatarAsset.findUnique({ where: { id: assetId } })
  if (!asset) throw new NotFoundError("Avatar no encontrado")
  try {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "pass-images"
    const { error } = await createAdminClient().storage.from(bucket).remove([asset.storagePath])
    if (error) throw error
    return db.businessAvatarAsset.update({ where: { id: asset.id }, data: { status: "COMPLETED", attempts: { increment: 1 }, deletedAt: new Date(), lastError: null } })
  } catch (error) {
    return db.businessAvatarAsset.update({ where: { id: asset.id }, data: { status: "FAILED", attempts: { increment: 1 }, lastError: error instanceof Error ? error.message : "Error de limpieza" } })
  }
}

export async function executeDueClosures(db: Db, now = new Date()) {
  const due = await db.accountClosure.findMany({ where: { status: "SCHEDULED", scheduledFor: { lte: now } }, select: { id: true, businessId: true } })
  for (const closure of due) {
    await db.business.delete({ where: { id: closure.businessId } })
  }
  return due.length
}
