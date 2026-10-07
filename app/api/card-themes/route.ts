import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, requestIdFrom, withRequestId } from "@/lib/api-utils"
import { syncExpiredEntitlements } from "@/lib/account-lifecycle"
import { listActiveThemes } from "@/lib/card-themes"

/**
 * @openapi
 * /api/card-themes:
 *   get:
 *     tags: [Cards]
 *     summary: List active card themes for the current business
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Active theme catalog and current plan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [themes, plan, primaryCardId]
 *               properties:
 *                 themes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required: [id, code, plan]
 *                     properties:
 *                       id: { type: string }
 *                       code: { type: string }
 *                       plan: { type: string, enum: [LITE, PRO] }
 *                 plan: { type: string, enum: [LITE, PRO] }
 *                 primaryCardId: { type: string, nullable: true }
 *                 primaryCardName: { type: string, nullable: true }
 */
export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const { business } = await getBusinessFromSession()
    const [themes, entitlements] = await Promise.all([
      listActiveThemes(prisma),
      syncExpiredEntitlements(prisma, business.id),
    ])
    const savedPrimary = entitlements.subscription?.liteCardId
      ? await prisma.loyaltyCard.findFirst({
          where: {
            id: entitlements.subscription.liteCardId,
            businessId: business.id,
            status: { in: ["ACTIVE", "LOCKED_BY_PLAN"] },
          },
          select: { id: true, name: true },
        })
      : null
    const fallbackLiteCard = entitlements.plan === "LITE" && !savedPrimary
      ? await prisma.loyaltyCard.findFirst({
          where: { businessId: business.id, status: "ACTIVE", isActive: true },
          select: { id: true, name: true },
          orderBy: { createdAt: "asc" },
        })
      : null
    const primaryCard = savedPrimary ?? fallbackLiteCard
    return withRequestId(NextResponse.json({
      themes,
      plan: entitlements.plan,
      primaryCardId: primaryCard?.id ?? null,
      primaryCardName: primaryCard?.name ?? null,
    }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}
