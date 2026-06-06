import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError } from "@/lib/api-utils"

/**
 * @openapi
 * /api/customers:
 *   get:
 *     tags:
 *       - Customers
 *     summary: Search customers
 *     description: Returns customers of the authenticated business, optionally filtered by name.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Case-insensitive name search term
 *     responses:
 *       200:
 *         description: Customer list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       stamps:
 *                         type: integer
 *                       maxStamps:
 *                         type: integer
 *                       cardName:
 *                         type: string
 *                       cardReward:
 *                         type: string
 *                       applePassId:
 *                         type: string
 *                         nullable: true
 *                       googlePassId:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  try {
    const business = await getBusinessFromSession()

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()
    const cardId = searchParams.get("cardId")?.trim()

    const where: Record<string, unknown> = {
      card: { businessId: business.id },
    }

    if (q) {
      where.name = { contains: q, mode: "insensitive" }
    }

    if (cardId) {
      where.cardId = cardId
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        card: { select: { name: true, stampsRequired: true, reward: true, brandColor: true } },
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
      cardBrandColor: c.card.brandColor,
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
