import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAccountPrincipal, handleApiError, ValidationError } from "@/lib/api-utils"
import { advanceSchema, onboardingDraftSchema } from "@/lib/onboarding-contracts"
import { advanceOnboarding, ensureCategories, getOnboarding, saveDraft } from "@/lib/onboarding-service"

export async function GET() {
  try {
    const principal = await getAccountPrincipal()
    await ensureCategories(prisma)
    const onboarding = await getOnboarding(prisma, principal.id)
    const categories = await prisma.businessCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
    return NextResponse.json({ onboarding, categories })
  } catch (error) { return handleApiError(error) }
}

export async function PATCH(request: NextRequest) {
  try {
    const principal = await getAccountPrincipal()
    const parsed = onboardingDraftSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError("Borrador de onboarding inválido")
    const onboarding = await saveDraft(prisma, principal.id, parsed.data)
    return NextResponse.json({ onboarding })
  } catch (error) { return handleApiError(error) }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await getAccountPrincipal()
    const parsed = advanceSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError("Acción de onboarding inválida")
    const onboarding = await advanceOnboarding(prisma, principal.id, parsed.data.action, parsed.data.draftVersion, parsed.data.billingInterval)
    return NextResponse.json({ onboarding })
  } catch (error) { return handleApiError(error) }
}
