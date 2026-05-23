import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, NotFoundError, ValidationError } from "@/lib/api-utils"

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const business = await getBusinessFromSession()
    const { id } = await params

    const existing = await prisma.loyaltyCard.findUnique({ where: { id } })
    if (!existing || existing.businessId !== business.id) {
      throw new NotFoundError("Tarjeta no encontrada")
    }

    const body = await request.json()

    if (body.name !== undefined && (!body.name || typeof body.name !== "string" || !body.name.trim())) {
      throw new ValidationError("El nombre de la tarjeta es obligatorio")
    }
    if (body.reward !== undefined && (!body.reward || typeof body.reward !== "string" || !body.reward.trim())) {
      throw new ValidationError("La recompensa es obligatoria")
    }
    if (body.stampsRequired !== undefined) {
      const s = Number(body.stampsRequired)
      if (s < 1 || s > 100) throw new ValidationError("Los sellos requeridos deben estar entre 1 y 100")
    }

    const card = await prisma.loyaltyCard.update({
      where: { id },
      data: {
        ...(body.name?.trim() && { name: body.name.trim() }),
        ...(body.reward?.trim() && { reward: body.reward.trim() }),
        ...(body.stampsRequired !== undefined && { stampsRequired: Number(body.stampsRequired) }),
        ...(body.brandColor !== undefined && { brandColor: body.brandColor }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }),
      },
    })

    return NextResponse.json({ card })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const business = await getBusinessFromSession()
    const { id } = await params

    const existing = await prisma.loyaltyCard.findUnique({ where: { id } })
    if (!existing || existing.businessId !== business.id) {
      throw new NotFoundError("Tarjeta no encontrada")
    }

    await prisma.loyaltyCard.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
