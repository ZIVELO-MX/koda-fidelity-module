import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, NotFoundError, requireRole, requestIdFrom, withRequestId } from "@/lib/api-utils"

/**
 * @openapi
 * /api/customers/{id}:
 *   delete:
 *     tags:
 *       - Customers
 *     summary: Deactivate customer
 *     description: Soft-deletes a customer by setting isActive to false. Only accessible by the business that owns the card.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer deactivated
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
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = requestIdFrom(request)
  try {
    const { business, user } = await getBusinessFromSession()
    requireRole(user, "admin")
    const { id } = await params

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { card: { select: { businessId: true } } },
    })

    if (!customer || customer.card.businessId !== business.id) {
      throw new NotFoundError("Customer not found")
    }

    const permanent = new URL(request.url).searchParams.get("permanent") === "true"
    if (permanent) {
      await prisma.$transaction(async (tx) => {
        await tx.customer.delete({ where: { id } })
      })
    } else {
      await prisma.customer.update({ where: { id }, data: { isActive: false } })
    }

    return withRequestId(NextResponse.json({ success: true }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}
