import type { PrismaClient, Role, ThemePlan } from "@prisma/client"
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/api-utils"
import { resolveTheme } from "@/lib/card-themes"
import type { AccountContext } from "@/lib/fidelity-contracts"
import { advanceSchema, onboardingDraftSchema, type AdvanceInput, type OnboardingDraftInput } from "@/lib/onboarding-contracts"
import { config } from "@/lib/config"

type MockUser = { id: string; email: string; name: string; role: Role }
type MockProgress = {
  step: "INTRO" | "BUSINESS" | "CARD" | "ACQUISITION" | "PAYWALL"
  status: "IN_PROGRESS" | "AWAITING_PAYMENT" | "ACTIVE"
  draftVersion: number
  businessDraft: Record<string, unknown> | null
  cardDraft: Record<string, unknown> | null
  acquisitionSource: string | null
  selectedBillingInterval: "MONTHLY" | "ANNUAL" | null
  firstCardId: string | null
}

type MockState = {
  user: MockUser
  progress: MockProgress
  categories: Array<{ id: string; name: string }>
  themes: Array<{ id: string; code: string; plan: ThemePlan }>
}

const registryKey = "__kodaOnboardingMockRegistry__"
type MockGlobal = typeof globalThis & { [registryKey]?: Map<string, MockState> }
const registry = ((globalThis as MockGlobal)[registryKey] ??= new Map<string, MockState>())

export function shouldUseOnboardingMock() {
  if (!process.env.FID_ONBOARDING_MOCK_EMAIL) return false
  if (!config.isDebugAuthEnabled) throw new ForbiddenError("El onboarding mock solo está permitido en development")
  return true
}

function targetEmail() {
  return process.env.FID_ONBOARDING_MOCK_EMAIL?.trim().toLowerCase() ?? null
}

async function getMockState(db: PrismaClient, principal: { id: string; email?: string | null }) {
  const target = targetEmail()
  if (!target || principal.email?.toLowerCase() !== target) throw new ForbiddenError("Esta sesión no es el usuario objetivo del onboarding mock")
  const cached = registry.get(principal.id)
  if (cached) return cached

  const [user, categories, themes] = await Promise.all([
    db.user.findUnique({ where: { authUserId: principal.id }, select: { id: true, email: true, name: true, role: true } }),
    db.businessCategory.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.loyaltyTheme.findMany({ where: { isActive: true }, select: { id: true, code: true, plan: true }, orderBy: [{ plan: "asc" }, { code: "asc" }] }),
  ])
  if (!user) throw new NotFoundError(`Cuenta de aplicación no encontrada: ${target}`)
  if (!categories.length) throw new ValidationError("El catálogo de categorías está vacío; prepara development antes del mock")
  if (!themes.length) throw new ValidationError("El catálogo de temas está vacío; prepara development antes del mock")

  const state: MockState = {
    user,
    categories,
    themes,
    progress: {
      step: "INTRO",
      status: "IN_PROGRESS",
      draftVersion: 0,
      businessDraft: null,
      cardDraft: null,
      acquisitionSource: null,
      selectedBillingInterval: null,
      firstCardId: null,
    },
  }
  registry.set(principal.id, state)
  return state
}

function response(state: MockState) {
  const onboarding = {
    id: state.user.id,
    email: state.user.email,
    name: state.user.name,
    role: state.user.role,
    onboardingProgress: state.progress,
    business: null,
  }
  const accountContext: AccountContext = {
    user: { id: state.user.id, email: state.user.email, name: state.user.name, role: state.user.role },
    business: null,
    onboardingStatus: state.progress.status,
    plan: "LITE",
  }
  return { onboarding, categories: state.categories, themes: state.themes, accountContext, mode: "mock" as const }
}

export async function getMockOnboarding(db: PrismaClient, principal: { id: string; email?: string | null }) {
  return response(await getMockState(db, principal))
}

export async function saveMockDraft(db: PrismaClient, principal: { id: string; email?: string | null }, input: OnboardingDraftInput) {
  const state = await getMockState(db, principal)
  if (state.progress.draftVersion !== input.draftVersion) throw new ConflictError("El borrador cambió; recarga el onboarding")
  state.progress = {
    ...state.progress,
    draftVersion: state.progress.draftVersion + 1,
    businessDraft: input.business ? { ...(state.progress.businessDraft ?? {}), ...input.business } : state.progress.businessDraft,
    cardDraft: input.card ? { ...(state.progress.cardDraft ?? {}), ...input.card } : state.progress.cardDraft,
    acquisitionSource: input.acquisitionSource === undefined ? state.progress.acquisitionSource : input.acquisitionSource,
    selectedBillingInterval: input.selectedBillingInterval === undefined ? state.progress.selectedBillingInterval : input.selectedBillingInterval,
  }
  return response(state)
}

export async function advanceMockOnboarding(db: PrismaClient, principal: { id: string; email?: string | null }, input: AdvanceInput) {
  const state = await getMockState(db, principal)
  if (state.progress.draftVersion !== input.draftVersion) throw new ConflictError("El borrador cambió; recarga el onboarding")

  const businessDraft = state.progress.businessDraft ?? {}
  const cardDraft = state.progress.cardDraft ?? {}
  if (input.action === "complete_business") {
    if (!businessDraft.name || !businessDraft.categoryId) throw new ValidationError("Completa nombre y categoría del negocio")
    if (!state.categories.some((category) => category.id === businessDraft.categoryId)) throw new ValidationError("Categoría inválida")
  }
  if (input.action === "complete_card") {
    if (!cardDraft.reward || !cardDraft.stampsRequired) throw new ValidationError("Completa recompensa y sellos de la tarjeta")
    const stamps = Number(cardDraft.stampsRequired)
    if (!Number.isInteger(stamps) || stamps < 1 || stamps > 100) throw new ValidationError("La tarjeta debe tener entre 1 y 100 sellos")
    if (cardDraft.themeId !== undefined) await resolveTheme(db, String(cardDraft.themeId), "PRO")
  }
  if (input.action === "select_billing_interval" && !input.billingInterval) throw new ValidationError("Selecciona una modalidad de cobro")

  const next = { ...state.progress, draftVersion: state.progress.draftVersion + 1 }
  if (input.action === "complete_intro" || input.action === "skip_intro") next.step = "BUSINESS"
  if (input.action === "complete_business") next.step = "CARD"
  if (input.action === "complete_card") {
    next.step = "ACQUISITION"
    next.firstCardId ??= `mock-card-${state.user.id}`
  }
  if (input.action === "complete_acquisition" || input.action === "skip_acquisition") next.step = "PAYWALL"
  if (input.action === "open_paywall") {
    next.step = "PAYWALL"
    next.status = "AWAITING_PAYMENT"
  }
  if (input.billingInterval) next.selectedBillingInterval = input.billingInterval
  state.progress = next
  return response(state)
}

export function parseMockDraft(input: unknown) {
  const parsed = onboardingDraftSchema.safeParse(input)
  if (!parsed.success) throw new ValidationError("Borrador de onboarding inválido")
  return parsed.data
}

export function parseMockAdvance(input: unknown) {
  const parsed = advanceSchema.safeParse(input)
  if (!parsed.success) throw new ValidationError("Acción de onboarding inválida")
  return parsed.data
}

export function resetMockStateForTests() {
  registry.clear()
}
