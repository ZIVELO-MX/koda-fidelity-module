import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, ValidationError, requestIdFrom, withRequestId, withApiContext } from "@/lib/api-utils"
import { activateManualSubscription, getEntitlements } from "@/lib/account-lifecycle"
import { manualSubscriptionSchema } from "@/lib/onboarding-contracts"

/**
 * @openapi
 * /api/subscription:
 *   get:
 *     tags: [Billing]
 *     summary: Get current manual subscription entitlements
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Subscription entitlements } }
 *   post:
 *     tags: [Billing]
 *     summary: Apply an internal manual subscription action
 *     responses: { 201: { description: Subscription updated } }
 */

export async function GET(request: NextRequest) {
  return withApiContext(request, async (requestId) => {
    const { business } = await getBusinessFromSession()
    return withRequestId(NextResponse.json({ entitlements: await getEntitlements(prisma, business.id) }), requestId)
  })()
}

export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const expected = process.env.BILLING_INTERNAL_SECRET
    if (!expected || request.headers.get("x-billing-internal-secret") !== expected) throw new ValidationError("Operación interna requerida")
    const body = await request.json()
    const parsed = manualSubscriptionSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError("Suscripción manual inválida")
    const businessId = parsed.data.businessId
    if (parsed.data.action === "cancel") {
      const canceled = await prisma.subscription.updateMany({ where: { businessId, status: "ACTIVE" }, data: { status: "CANCELED" } })
      return withRequestId(NextResponse.json({ canceled: canceled.count }), requestId)
    }
    if (parsed.data.action === "past_due") {
      const updated = await prisma.subscription.updateMany({ where: { businessId, status: "ACTIVE" }, data: { status: "PAST_DUE" } })
      return withRequestId(NextResponse.json({ updated: updated.count }), requestId)
    }
    const subscription = await activateManualSubscription(prisma, { ...parsed.data, operator: request.headers.get("x-operator") ?? "internal", idempotencyKey: request.headers.get("idempotency-key") ?? undefined })
    return withRequestId(NextResponse.json({ subscription, entitlements: await getEntitlements(prisma, businessId) }, { status: 201 }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
