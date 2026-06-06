import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, ValidationError, NotFoundError } from "@/lib/api-utils"

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
    const business = await getBusinessFromSession()

    const body = await request.json()

    if (!body.customerId || typeof body.customerId !== "string") {
      throw new ValidationError("Customer ID is required")
    }

    const type = body.type === "redeem" ? "redeem" : "stamp"

    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId },
      include: {
        card: { select: { businessId: true, stampsRequired: true, reward: true, expiresAt: true } },
      },
    })

    if (!customer) {
      throw new NotFoundError("Customer not found")
    }

    if (customer.card.businessId !== business.id) {
      throw new NotFoundError("Customer not found")
    }

    if (customer.card.expiresAt && customer.card.expiresAt < new Date()) {
      throw new ValidationError("This loyalty card has expired")
    }

    if (type === "stamp") {
      if (customer.stamps >= customer.card.stampsRequired) {
        throw new ValidationError("Customer has completed the card and must redeem first.")
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
        message: `${customer.name} now has ${updated.stamps} stamps`,
      })
    }

    if (type === "redeem") {
      if (customer.stamps < customer.card.stampsRequired) {
        throw new ValidationError(
          `Customer needs ${customer.card.stampsRequired - customer.stamps} more stamps to redeem`,
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
        message: `${customer.name} redeemed ${customer.card.reward}`,
      })
    }

    throw new ValidationError("Invalid operation type")
  } catch (error) {
    return handleApiError(error)
  }
}
