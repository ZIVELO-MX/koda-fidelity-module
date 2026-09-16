import { NextRequest, NextResponse } from "next/server"
import { getOpenApiSpec } from "@/lib/openapi"
import { requestIdFrom, withRequestId } from "@/lib/api-utils"

/**
 * @openapi
 * /api/openapi:
 *   get:
 *     tags: [System]
 *     summary: OpenAPI contract
 *     responses:
 *       200: { description: OpenAPI 3.1 document }
 */
export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request)
  const spec = getOpenApiSpec()
  return withRequestId(NextResponse.json(spec), requestId)
}
