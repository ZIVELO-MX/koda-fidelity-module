import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAccountPrincipal, handleApiError, ValidationError, requestIdFrom, withRequestId } from "@/lib/api-utils"
import { advanceSchema, onboardingDraftSchema } from "@/lib/onboarding-contracts"
import { advanceOnboarding, ensureCategories, getOnboarding, saveDraft } from "@/lib/onboarding-service"
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
 *     responses: { 200: { description: Draft saved } }
 *   post:
 *     tags: [Onboarding]
 *     summary: Advance onboarding
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Onboarding advanced } }
 */

export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const principal = await getAccountPrincipal()
    await ensureCategories(prisma)
    const onboarding = await getOnboarding(prisma, principal.id)
    const categories = await prisma.businessCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
    const business = onboarding.business
    const subscription = business?.subscriptions[0]
    const accountContext: AccountContext = {
      user: { id: onboarding.id, email: onboarding.email, name: onboarding.name, role: onboarding.role },
      business: business ? { id: business.id, name: business.name, brandColor: business.brandColor, logoUrl: business.logoUrl, iconName: business.iconName, website: business.website, instagram: business.instagram } : null,
      onboardingStatus: onboarding.onboardingProgress?.status,
      plan: subscription?.proAccessGranted ? "PRO" : (subscription?.plan ?? "LITE"),
    }
    return withRequestId(NextResponse.json({ onboarding, categories, accountContext }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}

export async function PATCH(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const principal = await getAccountPrincipal()
    const parsed = onboardingDraftSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError("Borrador de onboarding inválido")
    const onboarding = await saveDraft(prisma, principal.id, parsed.data)
    return withRequestId(NextResponse.json({ onboarding }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}

export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const principal = await getAccountPrincipal()
    const parsed = advanceSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError("Acción de onboarding inválida")
    const onboarding = await advanceOnboarding(prisma, principal.id, parsed.data.action, parsed.data.draftVersion, parsed.data.billingInterval)
    return withRequestId(NextResponse.json({ onboarding }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
