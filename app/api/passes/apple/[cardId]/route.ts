import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateLoyaltyPass } from "@/lib/passes/apple"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await params

  const body = await request.json()
  const customerName = body.customerName as string | undefined

  if (!customerName?.trim()) {
    return NextResponse.json(
      { error: "customerName is required" },
      { status: 400 },
    )
  }

  const loyaltyCard = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
  })

  if (!loyaltyCard) {
    return NextResponse.json(
      { error: "Loyalty card not found" },
      { status: 404 },
    )
  }

  const customer = await prisma.customer.create({
    data: {
      name: customerName.trim(),
      cardId: loyaltyCard.id,
      stamps: 0,
    },
  })

  const passBuffer = await generateLoyaltyPass(customer.id)

  await prisma.customer.update({
    where: { id: customer.id },
    data: { applePassId: customer.id },
  })

  return new NextResponse(passBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="koda-${cardId}.pkpass"`,
    },
  })
}
