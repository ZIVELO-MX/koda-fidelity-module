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
 *       - Pases Digitales
 *     summary: Generar URL de Google Wallet
 *     description: Crea un cliente y genera un JWT firmado para guardar en Google Wallet.
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la tarjeta de lealtad
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
 *                 description: Nombre del cliente
 *     responses:
 *       200:
 *         description: URL para guardar en Google Wallet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 saveUrl:
 *                   type: string
 *                   description: URL para guardar el pase
 *                 customerId:
 *                   type: string
 *       400:
 *         description: Nombre del cliente requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tarjeta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       501:
 *         description: Google Wallet no configurado
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
        error: "Google Wallet no está configurado",
        detail: getConfigError(),
      },
      { status: 501 },
    )
  }

  const body = await request.json()
  const customerName = body.customerName as string | undefined

  if (!customerName?.trim()) {
    return NextResponse.json(
      { error: "customerName is required" },
      { status: 400 },
    )
  }

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

  const customer = await prisma.customer.create({
    data: {
      name: customerName.trim(),
      cardId: loyaltyCard.id,
      stamps: 0,
    },
  })

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

  await prisma.customer.update({
    where: { id: customer.id },
    data: { googlePassId: customer.id },
  })

  return NextResponse.json({
    saveUrl: getSaveUrl(jwtToken),
    customerId: customer.id,
  })
}
