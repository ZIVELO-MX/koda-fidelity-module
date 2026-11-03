import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  generateLoyaltyPassJwt,
  getSaveUrl,
  isConfigured,
  getConfigError,
} from "@/lib/passes/google"
import { config } from "@/lib/config"
import { cuerpoJson, handleApiError, NotFoundError, requestIdFrom, withRequestId } from "@/lib/api-utils"
import { clienteTitular } from "@/lib/passes/titular"

/**
 * @openapi
 * /api/passes/google/{cardId}:
 *   post:
 *     tags:
 *       - Digital Passes
 *     summary: Generate Google Wallet URL
 *     description: Creates a customer and generates a signed JWT for Google Wallet.
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
 *         description: Customer name required
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
  const requestId = requestIdFrom(request)
  if (!config.isWalletEnabled) {
    return withRequestId(NextResponse.json({ error: "Wallet issuance is disabled", code: "KF-BILLING-004", requestId }, { status: 501 }), requestId)
  }
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

  try {
    const body = await cuerpoJson(request)
    const customer = await clienteTitular(cardId, body.customerId)
    const loyaltyCard = await prisma.loyaltyCard.findUnique({
      where: { id: cardId },
      include: { business: true },
    })
    if (!loyaltyCard) throw new NotFoundError("Loyalty card not found")

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
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}
