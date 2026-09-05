import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, ValidationError } from "@/lib/api-utils"
import { executeLoyaltyOperation } from "@/lib/loyalty-engine"

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

    if (body.type !== "stamp" && body.type !== "redeem") {
      throw new ValidationError("Invalid operation type")
    }
    const idempotencyKey = request.headers.get("Idempotency-Key")
    const result = await executeLoyaltyOperation(prisma, {
      businessId: business.id,
      customerId: body.customerId,
      type: body.type,
      idempotencyKey: idempotencyKey ?? "",
    })
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
