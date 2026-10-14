import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, requestIdFrom, withRequestId } from "@/lib/api-utils"
import { previewClosure } from "@/lib/account-lifecycle"

/**
 * @openapi
 * /api/account/deletion-impact:
 *   get:
 *     tags: [Account]
 *     summary: Preview irreversible account deletion impact
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Deletion impact } }
 */

export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const { business } = await getBusinessFromSession()
    const impact = await previewClosure(prisma, business.id)
    return withRequestId(NextResponse.json({ ...impact, irreversible: true, gracePeriodDays: 30 }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
