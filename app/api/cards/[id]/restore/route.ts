import { withSerializableRetry } from "@/lib/serializable-retry"
import { primaryReplacement, requireCardChangeConfirmation } from "@/lib/card-change-confirmation"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { applyEntitlements, getEntitlements, syncExpiredEntitlements } from "@/lib/account-lifecycle"
import { requireWritableBusinessPrincipal, handleApiError, ForbiddenError, NotFoundError, requireRole, requestIdFrom, ValidationError, withRequestId } from "@/lib/api-utils"

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

    await syncExpiredEntitlements(prisma, business.id)

    await withSerializableRetry(() => prisma.$transaction(async (tx) => {
      const existing = await tx.loyaltyCard.findUnique({ where: { id } })
      if (!existing || existing.businessId !== business.id) {
        throw new NotFoundError("Loyalty card not found")
      }
      // Antes cualquier estado pasaba a ACTIVE: restaurar un borrador del alta lo publicaba.
      if (existing.status !== "ARCHIVED") throw new ValidationError("Solo se puede restaurar una tarjeta archivada")

      const entitlements = await getEntitlements(tx, business.id)
      // Sin suscripción `plan` vale LITE y `applyEntitlements` dejaba la tarjeta
      // ACTIVE: un negocio dado de baja se reactivaba solo (PR #152).
      if (!entitlements.subscription) throw new ForbiddenError("La cuenta necesita un plan activo para restaurar tarjetas")
      const current = entitlements.plan === "LITE"
        ? await tx.loyaltyCard.findFirst({
            where: { businessId: business.id, status: "ACTIVE", isActive: true },
            orderBy: [{ isLite: "desc" }, { createdAt: "asc" }],
            select: { id: true, name: true },
          })
        : null
      await tx.loyaltyCard.update({ where: { id }, data: { isActive: true, status: "ACTIVE" } })
      const entitledCards = await applyEntitlements(tx, business.id, entitlements.plan, {
        preferredCardId: entitlements.subscription?.liteCardId,
        preserveDrafts: true,
      })
      if (current && entitledCards[0]) {
        requireCardChangeConfirmation(_request.headers.get("X-Confirm-Card-Change"), primaryReplacement(current, entitledCards[0].id))
      }
      await tx.subscription.update({
        where: { id: entitlements.subscription.id },
        data: { liteCardId: entitlements.plan === "LITE" ? (entitledCards[0]?.id ?? null) : entitlements.subscription.liteCardId },
      })
    }, { isolationLevel: "Serializable" }))

    return withRequestId(NextResponse.json({ success: true }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}
