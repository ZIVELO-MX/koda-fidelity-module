import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cuerpoJson, ForbiddenError, getBusinessFromSession, handleApiError, requestIdFrom, requireActivatedBusiness, requireRole, requireWritableBusinessPrincipal, ValidationError, withRequestId } from "@/lib/api-utils"
import { persistPrimaryCardPreference, resolveEffectiveEntitlements, resolveNewCardPrimarySelection, syncExpiredEntitlements } from "@/lib/account-lifecycle"
import { resolveTheme } from "@/lib/card-themes"
import type { CardSummary } from "@/lib/fidelity-contracts"

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
 *               textColor:
 *                 type: string
 *                 enum: [AUTO, DARK, LIGHT]
 *                 default: LIGHT
 *               iconName:
 *                 type: string
 *                 nullable: true
 *               stampIconName:
 *                 type: string
 *                 nullable: true
 *               themeId:
 *                 type: string
 *                 description: Selected theme ID or code
 *               isPrimary:
 *                 type: boolean
 *                 description: Save this as the preferred Lite card; when omitted, the first card becomes primary.
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
export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const { business } = await getBusinessFromSession()
    await syncExpiredEntitlements(prisma, business.id)

    const cards = await prisma.loyaltyCard.findMany({
      where: { businessId: business.id, isActive: true, status: "ACTIVE" },
      include: {
        _count: { select: { customers: true } },
        customers: { select: { stamps: true } },
        selectedTheme: { select: { id: true, code: true, plan: true } },
        effectiveTheme: { select: { id: true, code: true, plan: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const result: CardSummary[] = cards.map((card) => ({
      id: card.id,
      name: card.name,
      description: card.description,
      reward: card.reward,
      stampsRequired: card.stampsRequired,
      brandColor: card.brandColor,
      textColor: card.textColor,
      iconName: card.iconName,
      stampIconName: card.stampIconName,
      isActive: card.isActive,
      status: card.status,
      selectedThemeId: card.selectedThemeId,
      effectiveThemeId: card.effectiveThemeId,
      selectedTheme: card.selectedTheme,
      effectiveTheme: card.effectiveTheme,
      themeLocked: Boolean(card.selectedTheme && card.selectedTheme.plan === "PRO" && card.selectedThemeId !== card.effectiveThemeId),
      expiresAt: card.expiresAt,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      customers: card._count.customers,
      totalStamps: card.customers.reduce((sum, c) => sum + c.stamps, 0),
    }))

    return withRequestId(NextResponse.json({ cards: result }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}

export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const { business, user } = await requireWritableBusinessPrincipal()
    await requireActivatedBusiness(business.id)
    requireRole(user, "admin")

    const body = await cuerpoJson(request)

    if (body.textColor !== undefined && !["AUTO", "DARK", "LIGHT"].includes(String(body.textColor))) {
      throw new ValidationError("textColor must be AUTO, DARK, or LIGHT")
    }
    if (body.isPrimary !== undefined && typeof body.isPrimary !== "boolean") {
      throw new ValidationError("isPrimary must be a boolean")
    }

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

    await syncExpiredEntitlements(prisma, business.id)
    const card = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findFirst({
        where: { businessId: business.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      })
      if (!subscription) throw new ForbiddenError("La cuenta necesita un plan activo para crear tarjetas")

      const plan = resolveEffectiveEntitlements(subscription).plan
      const savedPrimary = subscription.liteCardId
        ? await tx.loyaltyCard.findFirst({
            where: { id: subscription.liteCardId, businessId: business.id, status: { in: ["ACTIVE", "LOCKED_BY_PLAN"] } },
            select: { id: true },
          })
        : null
      const activeLiteCard = plan === "LITE" && !savedPrimary
        ? await tx.loyaltyCard.findFirst({
            where: { businessId: business.id, status: "ACTIVE", isActive: true },
            select: { id: true },
            orderBy: { createdAt: "asc" },
          })
        : null
      const primarySelection = resolveNewCardPrimarySelection(plan, savedPrimary?.id ?? activeLiteCard?.id ?? null, body.isPrimary)
      const theme = await resolveTheme(tx, typeof body.themeId === "string" ? body.themeId : undefined, plan)
      const created = await tx.loyaltyCard.create({
        data: {
          businessId: business.id,
          name: body.name.trim(),
          reward: body.reward.trim(),
          stampsRequired,
          brandColor: body.brandColor || business.brandColor,
          textColor: body.textColor ?? "LIGHT",
          iconName: body.iconName === undefined ? business.iconName || null : body.iconName || null,
          stampIconName: body.stampIconName ?? null,
          description: body.description?.trim() || null,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          selectedThemeId: theme.selectedThemeId,
          effectiveThemeId: theme.effectiveThemeId,
          isActive: primarySelection.status === "ACTIVE",
          isLite: plan === "LITE" && primarySelection.isPrimary,
          status: primarySelection.status,
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
        include: { milestoneRewards: { orderBy: { stampNumber: "asc" } } },
      })

      if (primarySelection.isPrimary) {
        await persistPrimaryCardPreference(tx, {
          businessId: business.id,
          subscription,
          cardId: created.id,
          plan,
          isPrimary: true,
        })
      }

      const savedCard = await tx.loyaltyCard.findUniqueOrThrow({
        where: { id: created.id },
        include: { milestoneRewards: { orderBy: { stampNumber: "asc" } } },
      })
      return { ...savedCard, themeLocked: theme.themeLocked }
    })

    return withRequestId(NextResponse.json({ card, milestoneRewards: card.milestoneRewards }, { status: 201 }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}
