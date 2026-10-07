import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cuerpoJson, getBusinessFromSession, handleApiError, requestIdFrom, ValidationError, withApiContext, withRequestId } from "@/lib/api-utils"
import { activateManualSubscription, assertBusinessWritable, getEntitlements, syncExpiredEntitlements } from "@/lib/account-lifecycle"
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
    return withRequestId(NextResponse.json({ entitlements: await syncExpiredEntitlements(prisma, business.id) }), requestId)
  })()
}

export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const expected = process.env.BILLING_INTERNAL_SECRET
    // Credencial que falta o no coincide: 401, como en los cron. Antes era un 400.
    if (!expected || request.headers.get("x-billing-internal-secret") !== expected) {
      return withRequestId(NextResponse.json({ error: "Unauthorized", code: "KF-AUTH-001", action: "Proporciona la clave interna de facturación.", requestId, retryable: false }, { status: 401 }), requestId)
    }
    const body = await cuerpoJson(request)
    const parsed = manualSubscriptionSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError("Suscripción manual inválida")
    const businessId = parsed.data.businessId
    await assertBusinessWritable(prisma, businessId)
    if (parsed.data.action === "cancel" || parsed.data.action === "past_due") {
      const status = parsed.data.action === "cancel" ? "CANCELED" : "PAST_DUE"
      // Sin suscripción activa no hay acceso: se bloquean todas las tarjetas no
      // archivadas, igual que `INACTIVO` en PR #152. Antes solo cambiaba el
      // estado y las tarjetas seguían activas y con acabados Pro.
      // ponytail: misma escritura que deactivateManualSubscription de #152;
      // cuando ambos estén en dev, esta ruta puede llamarla directamente.
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.subscription.updateMany({ where: { businessId, status: "ACTIVE" }, data: { status } })
        await tx.loyaltyCard.updateMany({
          where: { businessId, status: { not: "ARCHIVED" } },
          data: { isActive: false, isLite: false, status: "LOCKED_BY_PLAN", effectiveThemeId: null },
        })
        return result
      })
      return withRequestId(NextResponse.json(parsed.data.action === "cancel" ? { canceled: updated.count } : { updated: updated.count }), requestId)
    }
    const subscription = await activateManualSubscription(prisma, { ...parsed.data, operator: request.headers.get("x-operator") ?? "internal", idempotencyKey: request.headers.get("idempotency-key") ?? undefined })
    return withRequestId(NextResponse.json({ subscription, entitlements: await getEntitlements(prisma, businessId) }, { status: 201 }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
