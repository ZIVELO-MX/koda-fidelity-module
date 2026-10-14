import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { syncExpiredEntitlementsBatch } from "@/lib/account-lifecycle"
import { handleApiError, requestIdFrom, withRequestId } from "@/lib/api-utils"

/**
 * @openapi
 * /api/cron/subscription-entitlements:
 *   post:
 *     tags: [System]
 *     summary: Apply expired subscription trials
 *     responses: { 200: { description: Number of processed subscriptions } }
 */

/** Authenticated scheduler entrypoint for expired Pro trials. */
export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const expected = process.env.CRON_SECRET
    const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!expected || supplied !== expected) {
      return withRequestId(NextResponse.json({ error: "Unauthorized", code: "KF-AUTH-001", action: "Proporciona la credencial del scheduler.", requestId, retryable: false }, { status: 401 }), requestId)
    }
    const processed = await syncExpiredEntitlementsBatch(prisma)
    return withRequestId(NextResponse.json({ processed }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}
