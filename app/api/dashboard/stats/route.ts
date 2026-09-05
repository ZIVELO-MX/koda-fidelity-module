import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, withRequestId } from "@/lib/api-utils"
import { statsQuerySchema } from "@/lib/dashboard-contracts"

/**
 * @openapi
 * /api/dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Historical dashboard metrics
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, minimum: 1, maximum: 90, default: 30 }
 *     responses:
 *       200: { description: Historical metrics, content: { application/json: { schema: { $ref: '#/components/schemas/DashboardStatsV2' } } } }
 *       400: { description: Invalid query, content: { application/json: { schema: { $ref: '#/components/schemas/ApiError' } } } }
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const { business } = await getBusinessFromSession()
    const parsed = statsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) return withRequestId(NextResponse.json({ error: "Parámetros inválidos", code: "KF-REQUEST-001", action: "Usa days entre 1 y 90.", requestId, retryable: false }, { status: 400 }), requestId)
    const days = parsed.data.days
    const periodEnd = new Date()
    const periodStart = new Date(periodEnd.getTime() - days * 86400000)
    const [totals, daily, weekly, topCards] = await Promise.all([
      prisma.$queryRaw<Array<{ activeCards: bigint; activeCustomers: bigint; stamps: bigint; redemptions: bigint; completedCycles: bigint }>>`SELECT (SELECT count(*) FROM "LoyaltyCard" c WHERE c."businessId" = ${business.id} AND c."isActive" = true) AS "activeCards", (SELECT count(*) FROM "Customer" cu JOIN "LoyaltyCard" c ON c.id = cu."cardId" WHERE c."businessId" = ${business.id} AND cu."isActive" = true) AS "activeCustomers", count(*) FILTER (WHERE l.type = 'stamp') AS stamps, count(*) FILTER (WHERE l.type = 'redeem') AS redemptions, count(*) FILTER (WHERE l.type = 'completion') AS "completedCycles" FROM "StampLog" l WHERE l."businessId" = ${business.id} AND l."createdAt" >= ${periodStart} AND l."createdAt" < ${periodEnd}`,
      prisma.$queryRaw<Array<{ date: string; stamps: bigint; redemptions: bigint }>>`SELECT (l."createdAt" AT TIME ZONE ${business.timezone})::date::text AS date, count(*) FILTER (WHERE l.type = 'stamp') AS stamps, count(*) FILTER (WHERE l.type = 'redeem') AS redemptions FROM "StampLog" l WHERE l."businessId" = ${business.id} AND l."createdAt" >= ${periodStart} AND l."createdAt" < ${periodEnd} GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<Array<{ weekStart: string; count: bigint }>>`SELECT date_trunc('week', l."createdAt" AT TIME ZONE ${business.timezone})::date::text AS "weekStart", count(*) AS count FROM "StampLog" l WHERE l."businessId" = ${business.id} AND l.type = 'customer_joined' AND l."createdAt" >= ${periodStart} AND l."createdAt" < ${periodEnd} GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<Array<{ id: string; name: string; stamps: bigint; redemptions: bigint; lastActivityAt: Date | null }>>`SELECT c.id, c.name, count(l.id) FILTER (WHERE l.type = 'stamp') AS stamps, count(l.id) FILTER (WHERE l.type = 'redeem') AS redemptions, max(l."createdAt") AS "lastActivityAt" FROM "LoyaltyCard" c LEFT JOIN "StampLog" l ON l."cardId" = c.id AND l."createdAt" >= ${periodStart} AND l."createdAt" < ${periodEnd} WHERE c."businessId" = ${business.id} GROUP BY c.id, c.name ORDER BY count(l.id) DESC, c.id LIMIT 10`,
    ])
    const total = totals[0] ?? { activeCards: 0, activeCustomers: 0, stamps: 0, redemptions: 0, completedCycles: 0 }
    const completedCycles = Number(total.completedCycles)
    const dailyByDate = new Map(daily.map((row) => [row.date, row]))
    const dailySeries = Array.from({ length: days }, (_, index) => {
      const date = new Date(periodStart.getTime() + index * 86400000).toISOString().slice(0, 10)
      const row = dailyByDate.get(date)
      return { date, stamps: Number(row?.stamps ?? 0), redemptions: Number(row?.redemptions ?? 0) }
    })
    return withRequestId(NextResponse.json({ period: { from: periodStart.toISOString(), to: periodEnd.toISOString(), timezone: business.timezone }, totals: { activeCards: Number(total.activeCards), activeCustomers: Number(total.activeCustomers), stamps: Number(total.stamps), redemptions: Number(total.redemptions), completedCycles, redemptionRate: completedCycles ? Number(total.redemptions) / completedCycles : null }, daily: dailySeries, weeklyNewCustomers: weekly.map((row) => ({ weekStart: row.weekStart, count: Number(row.count) })), topCards: topCards.map((row) => ({ id: row.id, name: row.name, stamps: Number(row.stamps), redemptions: Number(row.redemptions), lastActivityAt: row.lastActivityAt?.toISOString() ?? null })) }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
