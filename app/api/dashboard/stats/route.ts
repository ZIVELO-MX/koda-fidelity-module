import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError } from "@/lib/api-utils"

/**
 * @openapi
 * /api/dashboard/stats:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Estadísticas del dashboard
 *     description: Retorna estadísticas generales del negocio autenticado.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas del dashboard
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStats'
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
        customers: {
          select: { stamps: true },
          include: {
            _count: { select: { stampsLog: true } },
          },
        },
      },
    })

    const activeCards = cards.length
    const totalCustomers = cards.reduce((sum, c) => sum + c._count.customers, 0)
    const stampsGiven = cards.reduce(
      (sum, c) =>
        sum + c.customers.reduce((s, cust) => s + cust.stamps, 0),
      0,
    )

    const allLogs = await prisma.stampLog.findMany({
      where: {
        customer: {
          card: { businessId: business.id },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        customer: {
          select: {
            name: true,
            card: { select: { name: true } },
          },
        },
      },
    })

    const redemptions = allLogs.filter((l) => l.type === "redeem").length

    const recentActivity = allLogs.slice(0, 10).map((log) => ({
      type: log.type,
      customerName: log.customer.name,
      cardName: log.customer.card.name,
      createdAt: log.createdAt.toISOString(),
    }))

    const cardStats = cards.map((c) => ({
      id: c.id,
      name: c.name,
      reward: c.reward,
      stampsRequired: c.stampsRequired,
      brandColor: c.brandColor,
      customers: c._count.customers,
      stampsGiven: c.customers.reduce((s, cust) => s + cust.stamps, 0),
    }))

    return NextResponse.json({
      activeCards,
      totalCustomers,
      stampsGiven,
      redemptions,
      recentActivity,
      cards: cardStats,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
