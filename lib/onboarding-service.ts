import { Prisma, PrismaClient } from "@prisma/client"
import { ConflictError, NotFoundError, ValidationError } from "@/lib/api-utils"
import { resolveTheme } from "@/lib/card-themes"

type Db = PrismaClient
const categories = ["Café", "Restaurante", "Retail", "Belleza", "Salud y bienestar", "Servicios profesionales", "Entretenimiento", "Otro"]

export async function ensureCategories(db: Db) {
  return Promise.all(categories.map((name) => db.businessCategory.upsert({ where: { name }, create: { name }, update: { isActive: true } })))
}

export async function getOnboarding(db: Db, authUserId: string) {
  const user = await db.user.findUnique({
    where: { authUserId },
    include: { onboardingProgress: { include: { firstCard: true } }, business: { include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } } } },
  })
  if (!user) throw new NotFoundError("Cuenta no encontrada")
  if (!user.onboardingProgress) {
    await db.onboardingProgress.create({ data: { userId: user.id, businessId: user.businessId ?? undefined } })
    return getOnboarding(db, authUserId)
  }
  return user
}

type DraftInput = { draftVersion: number; business?: Record<string, unknown>; card?: Record<string, unknown>; acquisitionSource?: string | null; selectedBillingInterval?: "MONTHLY" | "ANNUAL" | null }

export async function saveDraft(db: Db, authUserId: string, input: DraftInput) {
  const user = await getOnboarding(db, authUserId)
  const progress = user.onboardingProgress!
  if (progress.draftVersion !== input.draftVersion) throw new ConflictError("El borrador cambió; recarga el onboarding")
  const business = progress.businessDraft && typeof progress.businessDraft === "object" ? progress.businessDraft as Record<string, unknown> : {}
  const card = progress.cardDraft && typeof progress.cardDraft === "object" ? progress.cardDraft as Record<string, unknown> : {}
  const updated = await db.onboardingProgress.updateMany({ where: { id: progress.id, draftVersion: input.draftVersion }, data: { draftVersion: { increment: 1 }, businessDraft: input.business ? { ...business, ...input.business } as Prisma.InputJsonValue : progress.businessDraft ?? undefined, cardDraft: input.card ? { ...card, ...input.card } as Prisma.InputJsonValue : progress.cardDraft ?? undefined, acquisitionSource: input.acquisitionSource === undefined ? undefined : input.acquisitionSource, selectedBillingInterval: input.selectedBillingInterval === undefined ? undefined : input.selectedBillingInterval } })
  if (updated.count !== 1) throw new ConflictError("El borrador cambió; recarga el onboarding")
  return getOnboarding(db, authUserId)
}

export async function advanceOnboarding(db: Db, authUserId: string, action: string, draftVersion: number, billingInterval?: "MONTHLY" | "ANNUAL") {
  const user = await getOnboarding(db, authUserId)
  const progress = user.onboardingProgress!
  if (progress.draftVersion !== draftVersion) throw new ConflictError("El borrador cambió; recarga el onboarding")
  const businessDraft = (progress.businessDraft ?? {}) as Record<string, unknown>
  const cardDraft = (progress.cardDraft ?? {}) as Record<string, unknown>
  if (action === "complete_business" && (!businessDraft.name || !businessDraft.categoryId)) throw new ValidationError("Completa nombre y categoría del negocio")
  if (action === "complete_card" && (!cardDraft.reward || !cardDraft.stampsRequired)) throw new ValidationError("Completa recompensa y sellos de la tarjeta")
  if (action === "select_billing_interval" && !billingInterval) throw new ValidationError("Selecciona una modalidad de cobro")
  const next: Prisma.OnboardingProgressUncheckedUpdateInput = {}
  if (action === "complete_intro" || action === "skip_intro") next.step = "BUSINESS"
  if (action === "complete_business") next.step = "CARD"
  if (action === "complete_card") next.step = "ACQUISITION"
  if (action === "complete_acquisition" || action === "skip_acquisition") next.step = "PAYWALL"
  if (action === "open_paywall") next.status = "AWAITING_PAYMENT"
  if (action === "skip_intro") next.introSkippedAt = new Date()
  if (action === "skip_acquisition") next.acquisitionSkippedAt = new Date()
  if (billingInterval) next.selectedBillingInterval = billingInterval
  if (action === "complete_card") {
    const category = await db.businessCategory.findUnique({ where: { id: String(businessDraft.categoryId) } })
    if (!category || !category.isActive) throw new ValidationError("Categoría inválida")
    if (progress.firstCardId) return getOnboarding(db, authUserId)
    const name = String(businessDraft.name)
    const stampsRequired = Number(cardDraft.stampsRequired)
    if (!Number.isInteger(stampsRequired) || stampsRequired < 1 || stampsRequired > 100) throw new ValidationError("La tarjeta debe tener entre 1 y 100 sellos")
    return db.$transaction(async (tx) => {
      const claimed = await tx.onboardingProgress.updateMany({ where: { id: progress.id, draftVersion }, data: { draftVersion: { increment: 1 } } })
      if (claimed.count !== 1) throw new ConflictError("El borrador cambió; recarga el onboarding")
      const business = user.businessId
        ? await tx.business.update({ where: { id: user.businessId }, data: { name, categoryId: category.id } })
        : await tx.business.create({ data: { name, categoryId: category.id, email: user.email } })
      if (!user.businessId) await tx.user.update({ where: { id: user.id }, data: { businessId: business.id } })
      const theme = await resolveTheme(tx, typeof cardDraft.themeId === "string" ? cardDraft.themeId : undefined, "PRO")
      const card = await tx.loyaltyCard.create({ data: { businessId: business.id, name: typeof cardDraft.name === "string" && cardDraft.name.trim() ? cardDraft.name.trim() : `Club ${name}`, reward: String(cardDraft.reward), stampsRequired, brandColor: typeof cardDraft.brandColor === "string" ? cardDraft.brandColor : business.brandColor, isActive: false, isLite: true, status: "DRAFT", selectedThemeId: theme.selectedThemeId, effectiveThemeId: theme.effectiveThemeId } })
      await tx.onboardingProgress.update({ where: { id: progress.id }, data: { ...next, businessId: business.id, firstCardId: card.id } })
      return { business, card }
    })
  }
  const updated = await db.onboardingProgress.updateMany({ where: { id: progress.id, draftVersion }, data: { ...next, draftVersion: { increment: 1 } } })
  if (updated.count !== 1) throw new ConflictError("El borrador cambió; recarga el onboarding")
  return getOnboarding(db, authUserId)
}
