import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError } from "@/lib/api-utils"

/**
 * @openapi
 * /api/customers:
 *   get:
 *     tags:
 *       - Clientes
 *     summary: Buscar clientes
 *     description: Retorna los clientes del negocio autenticado. Opcionalmente filtra por nombre.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Término de búsqueda por nombre (case-insensitive)
 *     responses:
 *       200:
 *         description: Lista de clientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       stamps:
 *                         type: integer
 *                       maxStamps:
 *                         type: integer
 *                       cardName:
 *                         type: string
 *                       cardReward:
 *                         type: string
 *                       applePassId:
 *                         type: string
 *                         nullable: true
 *                       googlePassId:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  try {
    const business = await getBusinessFromSession()

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()

    const where: Record<string, unknown> = {
      card: { businessId: business.id },
    }

    if (q) {
      where.name = { contains: q, mode: "insensitive" }
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        card: { select: { name: true, stampsRequired: true, reward: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const result = customers.map((c) => ({
      id: c.id,
      name: c.name,
      stamps: c.stamps,
      maxStamps: c.card.stampsRequired,
      cardName: c.card.name,
      cardReward: c.card.reward,
      applePassId: c.applePassId,
      googlePassId: c.googlePassId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))

    return NextResponse.json({ customers: result })
  } catch (error) {
    return handleApiError(error)
  }
}
