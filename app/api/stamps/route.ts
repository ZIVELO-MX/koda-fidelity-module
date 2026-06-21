import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, ValidationError, NotFoundError } from "@/lib/api-utils"
import { isExpired, pickMilestoneReward } from "@/lib/card-utils"

/**
 * @openapi
 * /api/stamps:
 *   post:
 *     tags:
 *       - Stamps
 *     summary: Add stamp or redeem reward
 *     description: |
 *       Adds a stamp to a customer's card or redeems the reward.
 *       - type: "stamp" adds one stamp
 *       - type: "redeem" redeems the reward and resets stamps to zero
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *             properties:
 *               customerId:
 *                 type: string
 *                 description: Customer ID
 *               type:
 *                 type: string
 *                 enum: [stamp, redeem]
 *                 default: stamp
 *                 description: Operation type
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customer:
 *                   $ref: '#/components/schemas/Customer'
 *                 event:
 *                   type: string
 *                   enum: [stamp, redeem]
 *                 message:
 *                   type: string
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
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: NextRequest) {
  try {
    const { business } = await getBusinessFromSession()

    const body = await request.json()

    if (!body.customerId || typeof body.customerId !== "string") {
      throw new ValidationError("Customer ID is required")
    }

    const type = body.type === "redeem" ? "redeem" : "stamp"

    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId },
      include: {
        card: {
          select: { id: true, businessId: true, stampsRequired: true, reward: true, expiresAt: true, milestoneRewards: { select: { id: true, stampNumber: true, label: true, iconName: true, probability: true } } },
        },
      },
    })

    if (!customer) {
      throw new NotFoundError("Customer not found")
    }

    if (customer.card.businessId !== business.id) {
      throw new NotFoundError("Customer not found")
    }

    if (!customer.isActive) {
      throw new NotFoundError("Customer not found")
    }

    if (isExpired(customer.card.expiresAt)) {
      throw new ValidationError("This loyalty card has expired")
    }

    if (type === "stamp") {
      if (customer.stamps >= customer.card.stampsRequired) {
        throw new ValidationError("Customer has completed the card and must redeem first.")
      }

      const updated = await prisma.customer.update({
        where: { id: customer.id, stamps: { lt: customer.card.stampsRequired } },
        data: {
          stamps: { increment: 1 },
          stampsLog: {
            create: { type: "stamp" },
          },
        },
        include: {
          card: { select: { name: true, stampsRequired: true, reward: true } },
        },
      }).catch((e: unknown) => {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")
          throw new ValidationError("Customer has completed the card and must redeem first.")
        throw e
      })

      // Check for milestone rewards at the new stamp position
      let milestoneClaim: { id: string; label: string; iconName: string | null } | null = null
      const milestones = customer.card.milestoneRewards

      if (milestones.length > 0) {
        const picked = pickMilestoneReward(updated.stamps, milestones)
        if (picked) {
          const dbMilestone = milestones.find(m => m.stampNumber === picked.stampNumber)!

          const [claim] = await prisma.$transaction([
            prisma.customerMilestoneClaim.create({
              data: {
                customerId: updated.id,
                milestoneId: dbMilestone.id,
                cardId: customer.card.id,
                label: picked.label,
                iconName: picked.iconName,
              },
            }),
            prisma.stampLog.create({
              data: {
                customerId: updated.id,
                type: "milestone",
                metadata: {
                  milestoneClaimId: dbMilestone.id,
                  milestoneLabel: picked.label,
                  milestoneIconName: picked.iconName,
                },
              },
            }),
          ])

          milestoneClaim = {
            id: claim.id,
            label: picked.label,
            iconName: picked.iconName,
          }
        }
      }

      return NextResponse.json({
        customer: updated,
        event: "stamp",
        message: `${customer.name} now has ${updated.stamps} stamps`,
        milestoneClaim,
      })
    }

    if (type === "redeem") {
      if (customer.stamps < customer.card.stampsRequired) {
        throw new ValidationError(
          `Customer needs ${customer.card.stampsRequired - customer.stamps} more stamps to redeem`,
        )
      }

      const updated = await prisma.customer.update({
        where: { id: customer.id, stamps: { gte: customer.card.stampsRequired } },
        data: {
          stamps: 0,
          stampsLog: {
            create: { type: "redeem" },
          },
        },
        include: {
          card: { select: { name: true, stampsRequired: true, reward: true } },
        },
      }).catch((e: unknown) => {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")
          throw new ValidationError("Customer needs more stamps to redeem")
        throw e
      })

      return NextResponse.json({
        customer: updated,
        event: "redeem",
        message: `${customer.name} redeemed ${customer.card.reward}`,
      })
    }

    throw new ValidationError("Invalid operation type")
  } catch (error) {
    return handleApiError(error)
  }
}
