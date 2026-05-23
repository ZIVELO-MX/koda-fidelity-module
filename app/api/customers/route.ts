import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  try {
    const business = await getBusinessFromSession()

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()

    const where: Record<string, unknown> = {
      card: { businessId: business.id },
    }

    if (q) {
      where.name = { contains: q, mode: "insensitive" }
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        card: { select: { name: true, stampsRequired: true, reward: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const result = customers.map((c) => ({
      id: c.id,
      name: c.name,
      stamps: c.stamps,
      maxStamps: c.card.stampsRequired,
      cardName: c.card.name,
      cardReward: c.card.reward,
      applePassId: c.applePassId,
      googlePassId: c.googlePassId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))

    return NextResponse.json({ customers: result })
  } catch (error) {
    return handleApiError(error)
  }
}
