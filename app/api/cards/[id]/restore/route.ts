import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getEntitlements, syncExpiredEntitlements } from "@/lib/account-lifecycle"
import { requireWritableBusinessPrincipal, handleApiError, NotFoundError, requireRole, requestIdFrom, ValidationError, withRequestId } from "@/lib/api-utils"

/**
 * @openapi
 * /api/cards/{id}/restore:
 *   post:
 *     tags: [Cards]
 *     summary: Restore an archived card
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Card restored } }
 */

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = requestIdFrom(_request)
  try {
    const { business, user } = await requireWritableBusinessPrincipal()
    requireRole(user, "admin")
    const { id } = await params

    const existing = await prisma.loyaltyCard.findUnique({ where: { id } })
    if (!existing || existing.businessId !== business.id) {
      throw new NotFoundError("Loyalty card not found")
    }

    await syncExpiredEntitlements(prisma, business.id)

    // Antes se activaba y luego `applyEntitlements` decidía cuál quedaba. Con
    // Lite eso respondía 200 y la restaurada volvía a bloquearse, o publicaba
    // en su lugar el borrador del alta, que también es `isLite`.
    await prisma.$transaction(async (tx) => {
      const { plan, subscription } = await getEntitlements(tx, business.id)
      if (plan === "LITE") {
        const otraActiva = await tx.loyaltyCard.findFirst({ where: { businessId: business.id, status: "ACTIVE", id: { not: id } }, select: { id: true } })
        if (otraActiva) throw new ValidationError("Con el plan Lite solo puede haber una tarjeta activa. Archiva la que está activa para restaurar esta.")
      }
      const tema = existing.selectedThemeId
        ? await tx.loyaltyTheme.findUnique({ where: { id: existing.selectedThemeId }, select: { plan: true } })
        : null
      const effectiveThemeId = tema && (tema.plan === "LITE" || plan === "PRO") ? existing.selectedThemeId : null
      await tx.loyaltyCard.update({ where: { id }, data: { isActive: true, status: "ACTIVE", isLite: plan === "LITE", effectiveThemeId } })
      if (subscription && plan === "LITE") {
        await tx.subscription.update({ where: { id: subscription.id }, data: { liteCardId: id } })
      }
    })

    return withRequestId(NextResponse.json({ success: true }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}
