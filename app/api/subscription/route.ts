import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, ValidationError } from "@/lib/api-utils"
import { activateManualSubscription, getEntitlements } from "@/lib/account-lifecycle"
import { manualSubscriptionSchema } from "@/lib/onboarding-contracts"

export async function GET() {
  try {
    const { business } = await getBusinessFromSession()
    return NextResponse.json({ entitlements: await getEntitlements(prisma, business.id) })
  } catch (error) { return handleApiError(error) }
}

export async function POST(request: NextRequest) {
  try {
    const expected = process.env.BILLING_INTERNAL_SECRET
    if (!expected || request.headers.get("x-billing-internal-secret") !== expected) throw new ValidationError("Operación interna requerida")
    const body = await request.json()
    const parsed = manualSubscriptionSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError("Suscripción manual inválida")
    const businessId = parsed.data.businessId
    if (parsed.data.action === "cancel") {
      const canceled = await prisma.subscription.updateMany({ where: { businessId, status: "ACTIVE" }, data: { status: "CANCELED" } })
      return NextResponse.json({ canceled: canceled.count })
    }
    if (parsed.data.action === "past_due") {
      const updated = await prisma.subscription.updateMany({ where: { businessId, status: "ACTIVE" }, data: { status: "PAST_DUE" } })
      return NextResponse.json({ updated: updated.count })
    }
    const subscription = await activateManualSubscription(prisma, { ...parsed.data, operator: request.headers.get("x-operator") ?? "internal", idempotencyKey: request.headers.get("idempotency-key") ?? undefined })
    return NextResponse.json({ subscription, entitlements: await getEntitlements(prisma, businessId) }, { status: 201 })
  } catch (error) { return handleApiError(error) }
}
