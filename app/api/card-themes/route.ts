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
 *               required: [themes, plan]
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
 */
export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const { business } = await getBusinessFromSession()
    const [themes, entitlements] = await Promise.all([
      listActiveThemes(prisma),
      syncExpiredEntitlements(prisma, business.id),
    ])
    return withRequestId(NextResponse.json({ themes, plan: entitlements.plan }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}
