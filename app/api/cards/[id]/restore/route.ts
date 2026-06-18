import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, NotFoundError, requireRole } from "@/lib/api-utils"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { business, user } = await getBusinessFromSession()
    requireRole(user, "admin")
    const { id } = await params

    const existing = await prisma.loyaltyCard.findUnique({ where: { id } })
    if (!existing || existing.businessId !== business.id) {
      throw new NotFoundError("Loyalty card not found")
    }

    await prisma.loyaltyCard.update({ where: { id }, data: { isActive: true } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
