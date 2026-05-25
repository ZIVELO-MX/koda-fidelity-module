import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, ValidationError } from "@/lib/api-utils"

/**
 * @openapi
 * /api/cards:
 *   get:
 *     tags:
 *       - Tarjetas
 *     summary: Listar tarjetas de lealtad
 *     description: Retorna todas las tarjetas de lealtad del negocio autenticado con estadísticas.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de tarjetas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cards:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LoyaltyCardWithStats'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     tags:
 *       - Tarjetas
 *     summary: Crear tarjeta de lealtad
 *     description: Crea una nueva tarjeta de lealtad para el negocio.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - reward
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre de la tarjeta
 *               reward:
 *                 type: string
 *                 description: Recompensa al completar
 *               stampsRequired:
 *                 type: integer
 *                 description: Sellos requeridos (1-100)
 *                 default: 10
 *               brandColor:
 *                 type: string
 *                 description: Color de marca en hex
 *               description:
 *                 type: string
 *                 description: Descripción opcional
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha de expiración opcional
 *     responses:
 *       201:
 *         description: Tarjeta creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 card:
 *                   $ref: '#/components/schemas/LoyaltyCard'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
  try {
    const business = await getBusinessFromSession()

    const cards = await prisma.loyaltyCard.findMany({
      where: { businessId: business.id },
      include: {
        _count: { select: { customers: true } },
        customers: { select: { stamps: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const result = cards.map((card) => ({
      id: card.id,
      name: card.name,
      description: card.description,
      reward: card.reward,
      stampsRequired: card.stampsRequired,
      brandColor: card.brandColor,
      expiresAt: card.expiresAt,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      customers: card._count.customers,
      totalStamps: card.customers.reduce((sum, c) => sum + c.stamps, 0),
    }))

    return NextResponse.json({ cards: result })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const business = await getBusinessFromSession()

    const body = await request.json()

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      throw new ValidationError("El nombre de la tarjeta es obligatorio")
    }
    if (!body.reward || typeof body.reward !== "string" || !body.reward.trim()) {
      throw new ValidationError("La recompensa es obligatoria")
    }

    const stampsRequired = typeof body.stampsRequired === "number" ? body.stampsRequired : 10
    if (stampsRequired < 1 || stampsRequired > 100) {
      throw new ValidationError("Los sellos requeridos deben estar entre 1 y 100")
    }

    const card = await prisma.loyaltyCard.create({
      data: {
        businessId: business.id,
        name: body.name.trim(),
        reward: body.reward.trim(),
        stampsRequired,
        brandColor: body.brandColor || business.brandColor,
        description: body.description?.trim() || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    })

    return NextResponse.json({ card }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
