import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateLoyaltyPass } from "@/lib/passes/apple"

/**
 * @openapi
 * /api/passes/apple/{cardId}:
 *   post:
 *     tags:
 *       - Digital Passes
 *     summary: Generate Apple Wallet pass
 *     description: Generates an Apple Wallet .pkpass for an existing customer.
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Loyalty card ID
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
 *                 description: Existing customer ID (created via POST /api/join)
 *     responses:
 *       200:
 *         description: Generated .pkpass file
 *         content:
 *           application/vnd.apple.pkpass:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: customerId required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Card or customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await params

  const body = await request.json()
  const existingCustomerId = body.customerId as string | undefined

  const loyaltyCard = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
  })

  if (!loyaltyCard) {
    return NextResponse.json(
      { error: "Loyalty card not found" },
      { status: 404 },
    )
  }

  if (!existingCustomerId) {
    return NextResponse.json(
      { error: "customerId is required" },
      { status: 400 },
    )
  }

  const customer = await prisma.customer.findUnique({
    where: { id: existingCustomerId },
  })
  if (!customer || customer.cardId !== cardId) {
    return NextResponse.json(
      { error: "Customer not found" },
      { status: 404 },
    )
  }

  const passBuffer = await generateLoyaltyPass(customer.id)

  if (!customer.applePassId) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { applePassId: customer.id },
    })
  }

  return new NextResponse(new Uint8Array(passBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="koda-${cardId}.pkpass"`,
    },
  })
}
