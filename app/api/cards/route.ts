import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, ValidationError, requireRole } from "@/lib/api-utils"

/**
 * @openapi
 * /api/cards:
 *   get:
 *     tags:
 *       - Cards
 *     summary: List loyalty cards
 *     description: Returns all loyalty cards for the authenticated business with statistics.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Card list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cards:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LoyaltyCardWithStats'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     tags:
 *       - Cards
 *     summary: Create loyalty card
 *     description: Creates a new loyalty card for the business.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - reward
 *             properties:
 *               name:
 *                 type: string
 *                 description: Card name
 *               reward:
 *                 type: string
 *                 description: Reward on completion
 *               stampsRequired:
 *                 type: integer
 *                 description: Required stamps (1-100)
 *                 default: 10
 *               brandColor:
 *                 type: string
 *                 description: Brand color in hexadecimal format
 *               description:
 *                 type: string
 *                 description: Optional description
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optional expiration date
 *     responses:
 *       201:
 *         description: Created card
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 card:
 *                   $ref: '#/components/schemas/LoyaltyCard'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
  try {
    const { business } = await getBusinessFromSession()

    const cards = await prisma.loyaltyCard.findMany({
      where: { businessId: business.id, isActive: true },
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
      iconName: card.iconName,
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
    const { business, user } = await getBusinessFromSession()
    requireRole(user, "admin")

    const body = await request.json()

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      throw new ValidationError("Card name is required")
    }
    if (!body.reward || typeof body.reward !== "string" || !body.reward.trim()) {
      throw new ValidationError("Reward is required")
    }

    const stampsRequired = typeof body.stampsRequired === "number" ? body.stampsRequired : 10
    if (stampsRequired < 1 || stampsRequired > 100) {
      throw new ValidationError("Required stamps must be between 1 and 100")
    }

    if (body.milestoneRewards !== undefined) {
      if (!Array.isArray(body.milestoneRewards)) {
        throw new ValidationError("milestoneRewards must be an array")
      }
      for (const m of body.milestoneRewards) {
        if (m.stampNumber < 1 || m.stampNumber > stampsRequired) {
          throw new ValidationError(`stampNumber ${m.stampNumber} is out of range (1-${stampsRequired})`)
        }
        if (!m.label || typeof m.label !== "string" || !m.label.trim()) {
          throw new ValidationError("Each milestone must have a label")
        }
        if (typeof m.probability !== "number" || m.probability < 0 || m.probability > 100) {
          throw new ValidationError("probability must be between 0 and 100")
        }
      }
      const seen = new Set<number>()
      for (const m of body.milestoneRewards) {
        if (seen.has(m.stampNumber)) {
          throw new ValidationError(`Duplicate stampNumber: ${m.stampNumber}`)
        }
        seen.add(m.stampNumber)
      }
    }

    const card = await prisma.loyaltyCard.create({
      data: {
        businessId: business.id,
        name: body.name.trim(),
        reward: body.reward.trim(),
        stampsRequired,
        brandColor: body.brandColor || business.brandColor,
        iconName: body.iconName || business.iconName || null,
        stampIconName: body.stampIconName ?? null,
        description: body.description?.trim() || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        milestoneRewards: body.milestoneRewards
          ? {
              create: body.milestoneRewards.map((m: { stampNumber: number; label: string; iconName?: string | null; probability: number }) => ({
                stampNumber: m.stampNumber,
                label: m.label.trim(),
                iconName: m.iconName || null,
                probability: m.probability,
              })),
            }
          : undefined,
      },
      include: {
        milestoneRewards: { orderBy: { stampNumber: "asc" } },
      },
    })

    return NextResponse.json({ card, milestoneRewards: card.milestoneRewards }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
