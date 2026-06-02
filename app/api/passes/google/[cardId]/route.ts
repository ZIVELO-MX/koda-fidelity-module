import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  generateLoyaltyPassJwt,
  getSaveUrl,
  isConfigured,
  getConfigError,
} from "@/lib/passes/google"

/**
 * @openapi
 * /api/passes/google/{cardId}:
 *   post:
 *     tags:
 *       - Digital Passes
 *     summary: Generate Google Wallet URL
 *     description: Generates a signed JWT for Google Wallet for an existing customer.
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
 *         description: Google Wallet save URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 saveUrl:
 *                   type: string
 *                   description: Pass save URL
 *                 customerId:
 *                   type: string
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
 *       501:
 *         description: Google Wallet not configured
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

  if (!isConfigured()) {
    return NextResponse.json(
      {
        error: "Google Wallet is not configured",
        detail: getConfigError(),
      },
      { status: 501 },
    )
  }

  const body = await request.json()
  const existingCustomerId = body.customerId as string | undefined

  const loyaltyCard = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    include: { business: true },
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

  const host = request.headers.get("host") || "localhost:3000"
  const proto = request.headers.get("x-forwarded-proto") || "http"
  const baseUrl = `${proto}://${host}`

  const jwtToken = await generateLoyaltyPassJwt({
    customerId: customer.id,
    cardId: loyaltyCard.id,
    customerName: customer.name,
    businessName: loyaltyCard.business.name,
    cardName: loyaltyCard.name,
    reward: loyaltyCard.reward,
    stamps: customer.stamps,
    stampsRequired: loyaltyCard.stampsRequired,
    brandColor: loyaltyCard.brandColor,
    baseUrl,
  })

  if (!customer.googlePassId) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { googlePassId: customer.id },
    })
  }

  return NextResponse.json({
    saveUrl: getSaveUrl(jwtToken),
    customerId: customer.id,
  })
}
