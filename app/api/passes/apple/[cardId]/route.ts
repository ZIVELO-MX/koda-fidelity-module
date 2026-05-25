import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateLoyaltyPass } from "@/lib/passes/apple"

/**
 * @openapi
 * /api/passes/apple/{cardId}:
 *   post:
 *     tags:
 *       - Pases Digitales
 *     summary: Generar pase de Apple Wallet
 *     description: Crea un cliente y genera un archivo .pkpass para Apple Wallet.
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
 *         description: Archivo .pkpass generado
 *         content:
 *           application/vnd.apple.pkpass:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Nombre del cliente requerido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Tarjeta no encontrada
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

  return new NextResponse(passBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="koda-${cardId}.pkpass"`,
    },
  })
}
