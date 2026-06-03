import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, NotFoundError } from "@/lib/api-utils"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const business = await getBusinessFromSession()
    const { id } = await params

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { card: { select: { businessId: true } } },
    })

    if (!customer || customer.card.businessId !== business.id) {
      throw new NotFoundError("Customer not found")
    }

    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
