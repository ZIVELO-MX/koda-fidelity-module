import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertBusinessWritable } from "@/lib/account-lifecycle"
import { getBusinessFromSession, handleApiError, requestIdFrom, ValidationError, withRequestId } from "@/lib/api-utils"
import { getLatestSubscriptionRequest, saveSubscriptionRequest, subscriptionRequestInputSchema } from "@/lib/subscription-requests"

/**
 * @openapi
 * /api/subscription-requests:
 *   get:
 *     tags: [Billing]
 *     summary: Read the latest manual activation request for the current business
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: The latest request, or null when none exists
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SubscriptionRequestResponse' }
 *   post:
 *     tags: [Billing]
 *     summary: Create or update the current business's pending manual activation request
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan, billingInterval]
 *             additionalProperties: false
 *             properties:
 *               plan: { type: string, enum: [LITE, PRO] }
 *               billingInterval: { type: string, enum: [MONTHLY, ANNUAL] }
 *     responses:
 *       201:
 *         description: Request created; no subscription or payment is created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SubscriptionRequestResponse' }
 *       200:
 *         description: Existing pending request reused or updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SubscriptionRequestResponse' }
 */

function publicRequest(request: Awaited<ReturnType<typeof getLatestSubscriptionRequest>>, businessName: string) {
  if (!request) return null
  return {
    ticketNumber: request.ticketNumber,
    plan: request.plan,
    billingInterval: request.billingInterval,
    status: request.status,
    businessName,
    contactEmail: request.requestedByUser.email,
    createdAt: request.createdAt.toISOString(),
  }
}

function privateResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } })
}

export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const { business } = await getBusinessFromSession()
    const saved = await getLatestSubscriptionRequest(prisma, business.id)
    return withRequestId(privateResponse({ request: publicRequest(saved, business.name) }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}

export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const { business, user } = await getBusinessFromSession()
    await assertBusinessWritable(prisma, business.id)
    const parsed = subscriptionRequestInputSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError("Solicitud de activación inválida")
    const saved = await saveSubscriptionRequest(prisma, { ...parsed.data, businessId: business.id, requestedByUserId: user.id })
    const current = await getLatestSubscriptionRequest(prisma, business.id)
    return withRequestId(privateResponse({ request: publicRequest(current, business.name) }, saved.created ? 201 : 200), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
