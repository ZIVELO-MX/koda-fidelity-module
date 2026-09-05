import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, withRequestId } from "@/lib/api-utils"
import { pageQuerySchema } from "@/lib/dashboard-contracts"

/**
 * @openapi
 * /api/customers:
 *   get:
 *     tags: [Customers]
 *     summary: Tenant-scoped customer search
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Paginated customers }
 *       400: { description: Invalid filters }
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const { business } = await getBusinessFromSession()
    const parsed = pageQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) return withRequestId(NextResponse.json({ error: "Parámetros inválidos", code: "KF-REQUEST-001", action: "Corrige los filtros y la paginación.", requestId, retryable: false }, { status: 400 }), requestId)
    const { q, cardId, readyToRedeem, sort, order, page, limit } = parsed.data
    const where: Prisma.CustomerWhereInput = { card: { businessId: business.id }, isActive: true }
    if (q) where.name = { contains: q, mode: "insensitive" }
    if (cardId) where.cardId = cardId
    if (readyToRedeem) {
      const ready = await prisma.$queryRaw<Array<{ id: string }>>`SELECT cu.id FROM "Customer" cu JOIN "LoyaltyCard" card ON card.id = cu."cardId" LEFT JOIN "LoyaltyCycle" cycle ON cycle.id = cu."currentCycleId" LEFT JOIN "CardConfiguration" config ON config.id = cycle."configurationId" WHERE card."businessId" = ${business.id} AND cu."isActive" = true AND COALESCE(cycle.balance, cu.stamps) >= COALESCE(config."stampsRequired", card."stampsRequired")`
      where.id = { in: ready.map(({ id }) => id) }
    }
    const orderBy: Prisma.CustomerOrderByWithRelationInput = sort === "name" ? { name: order } : sort === "stamps" ? { stamps: order } : sort === "updatedAt" ? { updatedAt: order } : { createdAt: order }
    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({ where, orderBy: [orderBy, { id: order }], skip: (page - 1) * limit, take: limit, include: { card: { select: { id: true, name: true, stampsRequired: true, reward: true, brandColor: true, expiresAt: true, isActive: true } }, currentCycle: { include: { configuration: true } } } }),
      prisma.customer.count({ where }),
    ])
    const items = customers.map((customer) => ({ id: customer.id, name: customer.name, stamps: customer.currentCycle?.balance ?? customer.stamps, goal: customer.currentCycle?.configuration.stampsRequired ?? customer.card.stampsRequired, cardId: customer.card.id, cardName: customer.card.name, cardReward: customer.currentCycle?.configuration.reward ?? customer.card.reward, cardBrandColor: customer.card.brandColor, cardExpiresAt: customer.card.expiresAt, cardIsActive: customer.card.isActive, applePassId: customer.applePassId, googlePassId: customer.googlePassId, createdAt: customer.createdAt, updatedAt: customer.updatedAt, readyToRedeem: (customer.currentCycle?.balance ?? customer.stamps) >= (customer.currentCycle?.configuration.stampsRequired ?? customer.card.stampsRequired) }))
    return withRequestId(NextResponse.json({ items, page, pageSize: limit, total }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
