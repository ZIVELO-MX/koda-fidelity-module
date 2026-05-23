import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, ValidationError, NotFoundError } from "@/lib/api-utils"

export async function POST(request: NextRequest) {
  try {
    const business = await getBusinessFromSession()

    const body = await request.json()

    if (!body.customerId || typeof body.customerId !== "string") {
      throw new ValidationError("ID del cliente es obligatorio")
    }

    const type = body.type === "redeem" ? "redeem" : "stamp"

    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId },
      include: {
        card: { select: { businessId: true, stampsRequired: true, reward: true } },
      },
    })

    if (!customer) {
      throw new NotFoundError("Cliente no encontrado")
    }

    if (customer.card.businessId !== business.id) {
      throw new NotFoundError("Cliente no encontrado")
    }

    if (type === "stamp") {
      if (customer.stamps >= customer.card.stampsRequired) {
        throw new ValidationError("El cliente ya completó su tarjeta. Debe canjear primero.")
      }

      const updated = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          stamps: { increment: 1 },
          stampsLog: {
            create: { type: "stamp" },
          },
        },
        include: {
          card: { select: { name: true, stampsRequired: true, reward: true } },
        },
      })

      return NextResponse.json({
        customer: updated,
        event: "stamp",
        message: `${customer.name} ahora tiene ${updated.stamps} sellos`,
      })
    }

    if (type === "redeem") {
      if (customer.stamps < customer.card.stampsRequired) {
        throw new ValidationError(
          `El cliente necesita ${customer.card.stampsRequired - customer.stamps} sellos más para canjear`,
        )
      }

      const updated = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          stamps: 0,
          stampsLog: {
            create: { type: "redeem" },
          },
        },
        include: {
          card: { select: { name: true, stampsRequired: true, reward: true } },
        },
      })

      return NextResponse.json({
        customer: updated,
        event: "redeem",
        message: `${customer.name} canjeó ${customer.card.reward}`,
      })
    }

    throw new ValidationError("Tipo de operación inválido")
  } catch (error) {
    return handleApiError(error)
  }
}
