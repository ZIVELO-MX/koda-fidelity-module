import { prisma } from "@/lib/prisma"

export function summarizeActiveCardCustomers(businessId: string) {
  return prisma.customer.groupBy({
    by: ["cardId"],
    where: { isActive: true, card: { businessId, isActive: true } },
    _count: { _all: true },
    _sum: { stamps: true },
  })
}

export const nearRewardPreviewLimit = 20

export function findNearRewardPreview(businessId: string) {
  return prisma.$queryRaw<{ id: string; nombre: string; tarjeta: string; total: bigint }[]>`
    SELECT member.id, member.name AS nombre, card.name AS tarjeta, count(*) OVER () AS total
    FROM "Customer" member
    JOIN "LoyaltyCard" card ON card.id = member."cardId"
    LEFT JOIN "LoyaltyCycle" cycle ON cycle.id = member."currentCycleId"
    LEFT JOIN "CardConfiguration" configuration ON configuration.id = cycle."configurationId"
    WHERE card."businessId" = ${businessId} AND card."isActive" AND member."isActive"
      AND member.stamps = COALESCE(configuration."stampsRequired", card."stampsRequired") - 1
    ORDER BY card."createdAt" DESC, card.id, member.name, member.id
    LIMIT ${nearRewardPreviewLimit}
  `
}
