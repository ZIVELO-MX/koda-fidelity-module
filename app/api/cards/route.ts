import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, ValidationError } from "@/lib/api-utils"

export async function GET() {
  try {
    const business = await getBusinessFromSession()

    const cards = await prisma.loyaltyCard.findMany({
      where: { businessId: business.id },
      include: {
        _count: { select: { customers: true } },
        customers: { select: { stamps: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const result = cards.map((card) => ({
      id: card.id,
      name: card.name,
      description: card.description,
      reward: card.reward,
      stampsRequired: card.stampsRequired,
      brandColor: card.brandColor,
      expiresAt: card.expiresAt,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      customers: card._count.customers,
      totalStamps: card.customers.reduce((sum, c) => sum + c.stamps, 0),
    }))

    return NextResponse.json({ cards: result })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const business = await getBusinessFromSession()

    const body = await request.json()

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      throw new ValidationError("El nombre de la tarjeta es obligatorio")
    }
    if (!body.reward || typeof body.reward !== "string" || !body.reward.trim()) {
      throw new ValidationError("La recompensa es obligatoria")
    }

    const stampsRequired = typeof body.stampsRequired === "number" ? body.stampsRequired : 10
    if (stampsRequired < 1 || stampsRequired > 100) {
      throw new ValidationError("Los sellos requeridos deben estar entre 1 y 100")
    }

    const card = await prisma.loyaltyCard.create({
      data: {
        businessId: business.id,
        name: body.name.trim(),
        reward: body.reward.trim(),
        stampsRequired,
        brandColor: body.brandColor || business.brandColor,
        description: body.description?.trim() || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    })

    return NextResponse.json({ card }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
