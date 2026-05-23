import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleApiError, ValidationError, NotFoundError } from "@/lib/api-utils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, cardId } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new ValidationError("El nombre es obligatorio")
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new ValidationError("Email inválido")
    }
    if (!cardId || typeof cardId !== "string") {
      throw new ValidationError("ID de tarjeta inválido")
    }

    const card = await prisma.loyaltyCard.findUnique({ where: { id: cardId } })
    if (!card) {
      throw new NotFoundError("Tarjeta no encontrada")
    }

    const existing = await prisma.customer.findFirst({
      where: { email, cardId },
    })
    if (existing) {
      return NextResponse.json({ customerId: existing.id, existing: true })
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email,
        cardId,
      },
    })

    return NextResponse.json({ customerId: customer.id, existing: false })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const email = searchParams.get("email")
    const cardId = searchParams.get("cardId")

    const where: Record<string, unknown> = {}
    if (id) where.id = id
    else if (email && cardId) {
      where.email = email
      where.cardId = cardId
    } else {
      throw new ValidationError("Proporciona ?id= o ?email=&cardId=")
    }

    const customer = await prisma.customer.findFirst({
      where,
      include: {
        card: {
          select: {
            name: true,
            stampsRequired: true,
            reward: true,
            brandColor: true,
            business: { select: { name: true, brandColor: true, logoUrl: true } },
          },
        },
      },
    })

    if (!customer) {
      throw new NotFoundError("Cliente no encontrado")
    }

    return NextResponse.json({ customer })
  } catch (error) {
    return handleApiError(error)
  }
}
