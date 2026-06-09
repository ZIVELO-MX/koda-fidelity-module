import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { handleApiError, NotFoundError, ValidationError, UnauthorizedError } from "@/lib/api-utils"
import { isExpired } from "@/lib/card-utils"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) throw new UnauthorizedError()

    const { customerId } = await params

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { card: { select: { expiresAt: true } } },
    })

    if (!customer) throw new NotFoundError("Customer not found")
    if (customer.email !== user.email) throw new NotFoundError("Customer not found")
    if (!isExpired(customer.card.expiresAt)) {
      throw new ValidationError("Only expired cards can be removed")
    }

    await prisma.customer.delete({ where: { id: customerId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
