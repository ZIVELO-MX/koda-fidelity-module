import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { applyEntitlements, getEntitlements, syncExpiredEntitlements } from "@/lib/account-lifecycle"
import { requireWritableBusinessPrincipal, handleApiError, NotFoundError, requireRole, requestIdFrom, withRequestId } from "@/lib/api-utils"

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

    await prisma.$transaction(async (tx) => {
      await tx.loyaltyCard.update({ where: { id }, data: { isActive: true, status: "ACTIVE" } })
      const entitlements = await getEntitlements(tx, business.id)
      const entitledCards = await applyEntitlements(tx, business.id, entitlements.plan)
      if (entitlements.subscription) {
        await tx.subscription.update({
          where: { id: entitlements.subscription.id },
          data: { liteCardId: entitlements.plan === "LITE" ? (entitledCards[0]?.id ?? null) : null },
        })
      }
    })

    return withRequestId(NextResponse.json({ success: true }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}
