import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cuerpoJson, getBusinessFromSession, handleApiError, UnauthorizedError, ValidationError, requestIdFrom, withRequestId } from "@/lib/api-utils"
import { cancelClosure, executeDueClosures, previewClosure, scheduleClosure } from "@/lib/account-lifecycle"

/**
 * @openapi
 * /api/account/closure:
 *   get:
 *     tags: [Account]
 *     summary: Preview account closure
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Closure impact and schedule } }
 *   post:
 *     tags: [Account]
 *     summary: Apply an internal account closure action
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: header
 *         name: x-account-closure-secret
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [businessId, action]
 *             properties:
 *               businessId: { type: string }
 *               action: { type: string, enum: [schedule, cancel, execute] }
 *     responses:
 *       200: { description: Closure canceled or execution result returned }
 *       201: { description: Closure scheduled }
 *       401: { description: Internal authorization required }
 */

export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const { business } = await getBusinessFromSession()
    return withRequestId(NextResponse.json(await previewClosure(prisma, business.id)), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}

export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const expected = process.env.ACCOUNT_CLOSURE_INTERNAL_SECRET
    if (!expected || request.headers.get("x-account-closure-secret") !== expected) throw new UnauthorizedError()
    const body = await cuerpoJson(request)
    const businessId = typeof body?.businessId === "string" ? body.businessId.trim() : ""
    if (!businessId) throw new ValidationError("Indica el negocio para gestionar el cierre")

    switch (body.action) {
      case "schedule":
        return withRequestId(NextResponse.json({ closure: await scheduleClosure(prisma, businessId) }, { status: 201 }), requestId)
      case "cancel":
        return withRequestId(NextResponse.json({ closure: await cancelClosure(prisma, businessId) }), requestId)
      case "execute":
        return withRequestId(NextResponse.json({ processed: await executeDueClosures(prisma, new Date(), businessId) }), requestId)
      default:
        throw new ValidationError("Indica una acción de cierre válida")
    }
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
