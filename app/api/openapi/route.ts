import { NextResponse } from "next/server"
import { getOpenApiSpec } from "@/lib/openapi"

/**
 * @openapi
 * /api/openapi:
 *   get:
 *     tags: [System]
 *     summary: OpenAPI contract
 *     responses:
 *       200: { description: OpenAPI 3.1 document }
 */
export async function GET() {
  const spec = getOpenApiSpec()
  return NextResponse.json(spec)
}
