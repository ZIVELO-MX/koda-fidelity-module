import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleApiError, NotFoundError } from "@/lib/api-utils"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const card = await prisma.loyaltyCard.findUnique({
      where: { id },
      include: {
        business: {
          select: { name: true, brandColor: true, logoUrl: true },
        },
      },
    })

    if (!card) {
      throw new NotFoundError("Tarjeta no encontrada")
    }

    return NextResponse.json({
      card: {
        id: card.id,
        name: card.name,
        description: card.description,
        reward: card.reward,
        stampsRequired: card.stampsRequired,
        brandColor: card.brandColor,
        expiresAt: card.expiresAt,
        businessName: card.business.name,
        businessBrandColor: card.business.brandColor,
        businessLogoUrl: card.business.logoUrl,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
