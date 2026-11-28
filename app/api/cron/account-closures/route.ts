import { NextRequest, NextResponse } from "next/server"
import { requestIdFrom, withRequestId } from "@/lib/api-utils"

/**
 * @openapi
 * /api/cron/account-closures:
 *   post:
 *     tags: [System]
 *     summary: Retired account closure scheduler endpoint
 *     deprecated: true
 *     responses: { 410: { description: Account closure is handled manually by support } }
 */
export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  return withRequestId(NextResponse.json({
    error: "El cierre automático está deshabilitado.",
    code: "KF-ACCOUNT-CLOSURE-MANUAL",
    requestId,
    retryable: false,
  }, { status: 410 }), requestId)
}
