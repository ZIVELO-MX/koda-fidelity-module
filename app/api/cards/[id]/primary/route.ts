import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { configurePrimaryCard, syncExpiredEntitlements } from "@/lib/account-lifecycle"
import { handleApiError, requireActivatedBusiness, requireRole, requireWritableBusinessPrincipal, requestIdFrom, withRequestId } from "@/lib/api-utils"

/**
 * @openapi
 * /api/cards/{id}/primary:
 *   post:
 *     tags: [Cards]
 *     summary: Configure the business's primary loyalty card
 *     description: Saves the card as the preferred Lite card. On Lite, it becomes the only active card; on Pro, it is saved as the preference for a future downgrade.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Card ID
 *     responses:
 *       200: { description: Primary card configured }
 *       400: { description: The card is a draft or manually archived }
 *       401: { description: Unauthorized }
 *       403: { description: Administrator or active plan required }
 *       404: { description: Card not found }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = requestIdFrom(request)
  try {
    const { business, user } = await requireWritableBusinessPrincipal()
    await requireActivatedBusiness(business.id)
    requireRole(user, "admin")
    await syncExpiredEntitlements(prisma, business.id)
    const { id } = await params
    const result = await configurePrimaryCard(prisma, business.id, id)
    return withRequestId(NextResponse.json({ success: true, ...result }, { headers: { "Cache-Control": "private, no-store" } }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}
