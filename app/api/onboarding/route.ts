import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cuerpoJson, getAccountPrincipal, handleApiError, requestIdFrom, ValidationError, withRequestId } from "@/lib/api-utils"
import { advanceSchema, onboardingDraftSchema } from "@/lib/onboarding-contracts"
import { advanceOnboarding, ensureCategories, getOnboarding, saveDraft } from "@/lib/onboarding-service"
import { assertBusinessWritable, syncExpiredEntitlements } from "@/lib/account-lifecycle"
import { listActiveThemes } from "@/lib/card-themes"
import { advanceMockOnboarding, getMockOnboarding, parseMockAdvance, parseMockDraft, saveMockDraft, shouldUseOnboardingMock } from "@/lib/onboarding-mock"
import type { AccountContext } from "@/lib/fidelity-contracts"

/**
 * @openapi
 * /api/onboarding:
 *   get:
 *     tags: [Onboarding]
 *     summary: Read onboarding state and categories
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Onboarding context } }
 *   patch:
 *     tags: [Onboarding]
 *     summary: Save an onboarding draft
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [draftVersion]
 *             properties:
 *               draftVersion: { type: integer, minimum: 0 }
 *               card:
 *                 type: object
 *                 properties:
 *                   themeId: { type: string }
 *                   textColor: { type: string, enum: [AUTO, DARK, LIGHT] }
 *                   iconName: { type: string, nullable: true }
 *                   stampIconName: { type: string, nullable: true }
 *     responses: { 200: { description: Draft saved } }
 *   post:
 *     tags: [Onboarding]
 *     summary: Advance onboarding
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, draftVersion]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [complete_intro, skip_intro, complete_business, complete_card, complete_card_ready, complete_acquisition, skip_acquisition, select_billing_interval, open_paywall]
 *               draftVersion: { type: integer, minimum: 0 }
 *               billingInterval: { type: string, enum: [MONTHLY, ANNUAL] }
 *     responses: { 200: { description: Onboarding advanced } }
 */

async function liveContext(onboarding: Awaited<ReturnType<typeof getOnboarding>>) {
  const business = onboarding.business
  const [categories, themes, entitlements] = await Promise.all([
    prisma.businessCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    listActiveThemes(prisma),
    business ? syncExpiredEntitlements(prisma, business.id) : null,
  ])
  const accountContext: AccountContext = {
    user: { id: onboarding.id, email: onboarding.email, name: onboarding.name, role: onboarding.role },
    business: business ? { id: business.id, name: business.name, brandColor: business.brandColor, logoUrl: business.logoUrl, iconName: business.iconName, website: business.website, instagram: business.instagram } : null,
    onboardingStatus: onboarding.onboardingProgress?.status,
    plan: onboarding.onboardingProgress?.status !== "ACTIVE" ? "PRO" : entitlements?.plan ?? "LITE",
  }
  return { onboarding, categories, themes, accountContext, mode: "live" }
}

export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const principal = await getAccountPrincipal()
    if (shouldUseOnboardingMock()) {
      return withRequestId(NextResponse.json(await getMockOnboarding(prisma, principal)), requestId)
    }
    await ensureCategories(prisma)
    const onboarding = await getOnboarding(prisma, principal.id)
    return withRequestId(NextResponse.json(await liveContext(onboarding)), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}

export async function PATCH(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const principal = await getAccountPrincipal()
    if (shouldUseOnboardingMock()) {
      const input = parseMockDraft(await cuerpoJson(request))
      return withRequestId(NextResponse.json(await saveMockDraft(prisma, principal, input)), requestId)
    }
    const current = await getOnboarding(prisma, principal.id)
    if (current.business) await assertBusinessWritable(prisma, current.business.id)
    const parsed = onboardingDraftSchema.safeParse(await cuerpoJson(request))
    if (!parsed.success) throw new ValidationError("Borrador de onboarding inválido")
    const onboarding = await saveDraft(prisma, principal.id, parsed.data)
    return withRequestId(NextResponse.json(await liveContext(onboarding)), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}

export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const principal = await getAccountPrincipal()
    if (shouldUseOnboardingMock()) {
      const input = parseMockAdvance(await cuerpoJson(request))
      return withRequestId(NextResponse.json(await advanceMockOnboarding(prisma, principal, input)), requestId)
    }
    const current = await getOnboarding(prisma, principal.id)
    if (current.business) await assertBusinessWritable(prisma, current.business.id)
    const parsed = advanceSchema.safeParse(await cuerpoJson(request))
    if (!parsed.success) throw new ValidationError("Acción de onboarding inválida")
    const onboarding = await advanceOnboarding(prisma, principal.id, parsed.data.action, parsed.data.draftVersion, parsed.data.billingInterval)
    return withRequestId(NextResponse.json(await liveContext(onboarding)), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
