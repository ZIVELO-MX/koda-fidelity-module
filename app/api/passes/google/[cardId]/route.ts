import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  generateLoyaltyPassJwt,
  getSaveUrl,
  isConfigured,
  getConfigError,
} from "@/lib/passes/google"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await params

  if (!isConfigured()) {
    return NextResponse.json(
      {
        error: "Google Wallet no está configurado",
        detail: getConfigError(),
      },
      { status: 501 },
    )
  }

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
    include: { business: true },
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

  const origin = request.headers.get("origin") || request.nextUrl.origin
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin

  const jwtToken = await generateLoyaltyPassJwt({
    customerId: customer.id,
    cardId: loyaltyCard.id,
    customerName: customer.name,
    businessName: loyaltyCard.business.name,
    cardName: loyaltyCard.name,
    reward: loyaltyCard.reward,
    stamps: customer.stamps,
    stampsRequired: loyaltyCard.stampsRequired,
    brandColor: loyaltyCard.brandColor,
    baseUrl,
  })

  await prisma.customer.update({
    where: { id: customer.id },
    data: { googlePassId: customer.id },
  })

  return NextResponse.json({
    saveUrl: getSaveUrl(jwtToken),
    customerId: customer.id,
  })
}
