import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, NotFoundError, ValidationError, requireRole } from "@/lib/api-utils"
import { isExpired } from "@/lib/card-utils"

/**
 * @openapi
 * /api/cards/{id}:
 *   get:
 *     tags:
 *       - Cards
 *     summary: Get loyalty card
 *     description: Returns public loyalty card details without requiring authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID
 *     responses:
 *       200:
 *         description: Card details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 card:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     reward:
 *                       type: string
 *                     stampsRequired:
 *                       type: integer
 *                     brandColor:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     businessName:
 *                       type: string
 *                     businessBrandColor:
 *                       type: string
 *                     businessLogoUrl:
 *                       type: string
 *                       nullable: true
 *       404:
 *         description: Card not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     tags:
 *       - Cards
 *     summary: Update loyalty card
 *     description: Updates an existing card. Requires ownership of the business.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               reward:
 *                 type: string
 *               stampsRequired:
 *                 type: integer
 *               brandColor:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated card
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
 *       404:
 *         description: Card not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags:
 *       - Cards
 *     summary: Delete loyalty card
 *     description: Deletes a card and all associated customers. Requires ownership of the business.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID
 *     responses:
 *       200:
 *         description: Deleted card
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Card not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
          select: { name: true, brandColor: true, logoUrl: true, iconName: true },
        },
      },
    })

    if (!card) {
      throw new NotFoundError("Loyalty card not found")
    }

    return NextResponse.json({
      card: {
        id: card.id,
        name: card.name,
        description: card.description,
        reward: card.reward,
        stampsRequired: card.stampsRequired,
        brandColor: card.brandColor,
        iconName: card.iconName,
        isActive: card.isActive,
        stampIconName: card.stampIconName,
        expiresAt: card.expiresAt,
        expired: isExpired(card.expiresAt),
        businessName: card.business.name,
        businessBrandColor: card.business.brandColor,
        businessLogoUrl: card.business.logoUrl,
        businessIconName: card.business.iconName,
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
    const { business, user } = await getBusinessFromSession()
    requireRole(user, "admin")
    const { id } = await params

    const existing = await prisma.loyaltyCard.findUnique({ where: { id } })
    if (!existing || existing.businessId !== business.id) {
      throw new NotFoundError("Loyalty card not found")
    }

    const body = await request.json()

    if (body.name !== undefined && (!body.name || typeof body.name !== "string" || !body.name.trim())) {
      throw new ValidationError("Card name is required")
    }
    if (body.reward !== undefined && (!body.reward || typeof body.reward !== "string" || !body.reward.trim())) {
      throw new ValidationError("Reward is required")
    }
    if (body.stampsRequired !== undefined) {
      const s = Number(body.stampsRequired)
      if (s < 1 || s > 100) throw new ValidationError("Required stamps must be between 1 and 100")
    }

    const card = await prisma.loyaltyCard.update({
      where: { id },
      data: {
        ...(body.name?.trim() && { name: body.name.trim() }),
        ...(body.reward?.trim() && { reward: body.reward.trim() }),
        ...(body.stampsRequired !== undefined && { stampsRequired: Number(body.stampsRequired) }),
        ...(body.brandColor !== undefined && { brandColor: body.brandColor }),
        ...(body.iconName !== undefined && { iconName: body.iconName || null }),
        ...(body.stampIconName !== undefined && { stampIconName: body.stampIconName || null }),
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { business, user } = await getBusinessFromSession()
    requireRole(user, "admin")
    const { id } = await params

    const existing = await prisma.loyaltyCard.findUnique({ where: { id } })
    if (!existing || existing.businessId !== business.id) {
      throw new NotFoundError("Loyalty card not found")
    }

    const permanent = new URL(request.url).searchParams.get("permanent") === "true"
    if (permanent) {
      await prisma.loyaltyCard.delete({ where: { id } })
    } else {
      await prisma.loyaltyCard.update({ where: { id }, data: { isActive: false } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
