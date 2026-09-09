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

export function addGraceDays(date: Date, days = 30) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

export function periodForInterval(start: Date, interval: "MONTHLY" | "ANNUAL") { return addCalendarMonths(start, interval === "ANNUAL" ? 12 : 1) }

export async function activateManualSubscription(db: Db, input: { businessId: string; plan?: "LITE" | "PRO"; billingInterval?: "MONTHLY" | "ANNUAL"; amountMinor?: number; externalReference?: string; periodStart?: Date; periodEnd?: Date; operator?: string; idempotencyKey?: string; action?: string; proAccessGranted?: boolean }) {
  const plan = input.plan ?? "LITE"
  const billingInterval = input.billingInterval ?? "MONTHLY"
  const periodStart = input.periodStart ?? new Date()
  const periodEnd = input.periodEnd ?? periodForInterval(periodStart, billingInterval)
  if (periodEnd <= periodStart) throw new ValidationError("El periodo debe terminar después de iniciar")
  if (!await db.business.findUnique({ where: { id: input.businessId }, select: { id: true } })) throw new NotFoundError("Negocio no encontrado")
  const idempotencyKey = input.idempotencyKey ?? `manual:${input.businessId}:${periodStart.toISOString()}`
  const previous = await db.billingAuditEvent.findUnique({ where: { idempotencyKey } })
  if (previous) return db.subscription.findFirstOrThrow({ where: { businessId: input.businessId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } })
  return db.$transaction(async (tx) => {
    await tx.subscription.updateMany({ where: { businessId: input.businessId, status: "ACTIVE" }, data: { status: "CANCELED" } })
    const proAccessGranted = input.proAccessGranted ?? plan === "PRO"
    const subscription = await tx.subscription.create({ data: { businessId: input.businessId, plan, billingInterval, amountMinor: input.amountMinor ?? 0, currency: "MXN", activatedAt: periodStart, periodStart, periodEnd, externalReference: input.externalReference, proAccessGranted } })
    await applyEntitlements(tx, input.businessId, subscription.proAccessGranted ? "PRO" : "LITE")
    await tx.onboardingProgress.updateMany({ where: { businessId: input.businessId }, data: { status: "ACTIVE", step: "PAYWALL" } })
    await tx.billingAuditEvent.create({ data: { businessId: input.businessId, action: input.action ?? "activate", operator: input.operator ?? "internal", idempotencyKey, externalReference: input.externalReference, metadata: { plan, billingInterval, amountMinor: input.amountMinor ?? 0 } } })
    return subscription
  })
}

export async function applyEntitlements(db: PrismaClient | Prisma.TransactionClient, businessId: string, plan: SubscriptionPlan) {
  const cards = await db.loyaltyCard.findMany({ where: { businessId }, orderBy: { createdAt: "asc" } })
  if (plan === "PRO") { await db.loyaltyCard.updateMany({ where: { businessId, status: { not: "ARCHIVED" } }, data: { isActive: true, isLite: false, status: "ACTIVE" } }); return cards }
  const keep = cards.find((card) => card.isLite && card.status !== "ARCHIVED") ?? cards.find((card) => card.status !== "ARCHIVED")
  if (!keep) return cards
  await db.loyaltyCard.updateMany({ where: { businessId, status: "ACTIVE", id: { not: keep.id } }, data: { isActive: false, isLite: false, status: "LOCKED_BY_PLAN" } })
  await db.loyaltyCard.update({ where: { id: keep.id }, data: { isActive: true, isLite: true, status: "ACTIVE" } })
  return [keep]
}

export async function getEntitlements(db: Db, businessId: string, _now = new Date()) {
  const subscription = await db.subscription.findFirst({ where: { businessId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } })
  const trial = Boolean(subscription?.proAccessGranted && subscription?.plan === "LITE")
  return { plan: subscription?.proAccessGranted ? "PRO" : (subscription?.plan ?? "LITE"), billingInterval: subscription?.billingInterval ?? null, subscription, trial }
}

export async function syncExpiredEntitlements(db: Db, businessId: string, now = new Date()) {
  const entitlements = await getEntitlements(db, businessId, now)
  await applyEntitlements(db, businessId, entitlements.plan as SubscriptionPlan)
  return entitlements
}

export async function createCustomerProfile(db: Db, input: { authUserId: string; email: string; name: string; avatarPath?: string | null }) {
  const emailNormalized = normalizeProfileEmail(input.email)
  if (!emailNormalized || !emailNormalized.includes("@") || !input.name.trim()) throw new ValidationError("Perfil de cliente inválido")
  const byAuth = await db.customerProfile.findUnique({ where: { authUserId: input.authUserId } })
  const byEmail = await db.customerProfile.findUnique({ where: { emailNormalized } })
  if (byAuth && byEmail && byAuth.id !== byEmail.id) throw new ConflictError("La identidad y el correo pertenecen a perfiles distintos")
  if (byEmail && byEmail.authUserId !== input.authUserId) throw new ConflictError("El correo ya pertenece a otra identidad")
  if (byAuth) return db.customerProfile.update({ where: { id: byAuth.id }, data: { name: input.name.trim(), emailNormalized, avatarPath: input.avatarPath === undefined ? byAuth.avatarPath : input.avatarPath } })
  return db.customerProfile.create({ data: { authUserId: input.authUserId, emailNormalized, name: input.name.trim(), avatarPath: input.avatarPath ?? null } })
}

export async function scheduleClosure(db: Db, businessId: string, now = new Date()) {
  const scheduledFor = addGraceDays(now, 30)
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

export async function replaceCustomerAvatar(db: Db, profileId: string, bucket: string, storagePath: string) {
  const profile = await db.customerProfile.findUnique({ where: { id: profileId } })
  if (!profile) throw new NotFoundError("Perfil de cliente no encontrado")
  return db.$transaction(async (tx) => {
    if (profile.avatarPath) {
      await tx.avatarCleanupJob.create({ data: { profileId, bucket, storagePath: profile.avatarPath } })
    }
    return tx.customerProfile.update({ where: { id: profileId }, data: { avatarPath: storagePath } })
  })
}

export async function cleanupAvatarJob(db: Db, jobId: string) {
  const job = await db.avatarCleanupJob.findUnique({ where: { id: jobId } })
  if (!job) throw new NotFoundError("Trabajo de limpieza no encontrado")
  try {
    const { error } = await createAdminClient().storage.from(job.bucket).remove([job.storagePath])
    if (error) throw error
    return db.avatarCleanupJob.update({ where: { id: job.id }, data: { status: "COMPLETED", attempts: { increment: 1 }, deletedAt: new Date(), lastError: null } })
  } catch (error) {
    return db.avatarCleanupJob.update({ where: { id: job.id }, data: { status: "FAILED", attempts: { increment: 1 }, lastError: error instanceof Error ? error.message : "Error de limpieza" } })
  }
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
