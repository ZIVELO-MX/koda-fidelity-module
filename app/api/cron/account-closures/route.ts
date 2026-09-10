import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { executeDueClosures } from "@/lib/account-lifecycle"
import { handleApiError, requestIdFrom, withRequestId } from "@/lib/api-utils"

/**
 * @openapi
 * /api/cron/account-closures:
 *   get:
 *     tags: [System]
 *     summary: Execute due account closures
 *     responses: { 200: { description: Number of processed closures } }
 *   post:
 *     tags: [System]
 *     summary: Execute due account closures
 *     responses: { 200: { description: Number of processed closures } }
 */

/** Authenticated scheduler entrypoint for the 30-day account closure worker. */
export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const expected = process.env.CRON_SECRET
    const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!expected || supplied !== expected) return withRequestId(NextResponse.json({ error: "Unauthorized", code: "KF-AUTH-001", action: "Proporciona la credencial del scheduler.", requestId, retryable: false }, { status: 401 }), requestId)
    const processed = await executeDueClosures(prisma)
    return withRequestId(NextResponse.json({ processed }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
