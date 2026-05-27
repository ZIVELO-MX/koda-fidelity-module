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
 *     description: Creates a customer and generates an Apple Wallet .pkpass file.
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
 *               - customerName
 *             properties:
 *               customerName:
 *                 type: string
 *                 description: Customer name
 *     responses:
 *       200:
 *         description: Generated .pkpass file
 *         content:
 *           application/vnd.apple.pkpass:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Customer name required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Card not found
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
  const customerName = body.customerName as string | undefined
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

  let customer

  if (existingCustomerId) {
    customer = await prisma.customer.findUnique({
      where: { id: existingCustomerId },
    })
    if (!customer || customer.cardId !== cardId) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      )
    }
  } else {
    if (!customerName?.trim()) {
      return NextResponse.json(
        { error: "customerName is required" },
        { status: 400 },
      )
    }

    customer = await prisma.customer.create({
      data: {
        name: customerName.trim(),
        cardId: loyaltyCard.id,
        stamps: 0,
      },
    })
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
