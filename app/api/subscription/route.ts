import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, ValidationError, requireRole } from "@/lib/api-utils"
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
    const { business, user } = await getBusinessFromSession()
    requireRole(user, "admin")
    const parsed = manualSubscriptionSchema.safeParse({ ...(await request.json()), businessId: business.id })
    if (!parsed.success) throw new ValidationError("Suscripción manual inválida")
    if (parsed.data.action === "cancel") {
      const canceled = await prisma.subscription.updateMany({ where: { businessId: business.id, status: "ACTIVE" }, data: { status: "CANCELED" } })
      return NextResponse.json({ canceled: canceled.count })
    }
    if (parsed.data.action === "past_due") {
      const updated = await prisma.subscription.updateMany({ where: { businessId: business.id, status: "ACTIVE" }, data: { status: "PAST_DUE" } })
      return NextResponse.json({ updated: updated.count })
    }
    const subscription = await activateManualSubscription(prisma, parsed.data)
    return NextResponse.json({ subscription, entitlements: await getEntitlements(prisma, business.id) }, { status: 201 })
  } catch (error) { return handleApiError(error) }
}
