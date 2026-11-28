import { randomUUID } from "node:crypto"
import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { findNearRewardPreview, nearRewardPreviewLimit, summarizeActiveCardCustomers } from "@/lib/dashboard-card-metrics"

describe.skipIf(process.env.CI !== "true")("métricas de clientes por tarjeta", () => {
  it("suma clientes activos y limita la vista previa respetando la meta del ciclo", async () => {
    const business = await prisma.business.create({
      data: { name: "Métricas", email: `metrics-${randomUUID()}@test.invalid` },
    })
    const other = await prisma.business.create({
      data: { name: "Otro negocio", email: `metrics-${randomUUID()}@test.invalid` },
    })
    try {
      expect(await summarizeActiveCardCustomers(business.id)).toEqual([])
      expect(await findNearRewardPreview(business.id)).toEqual([])

      const first = await prisma.loyaltyCard.create({
        data: { businessId: business.id, name: "Primera", createdAt: new Date("2026-01-01"), reward: "Café", stampsRequired: 5, isActive: true },
      })
      const second = await prisma.loyaltyCard.create({
        data: { businessId: business.id, name: "Segunda", createdAt: new Date("2026-01-02"), reward: "Café", stampsRequired: 8, isActive: true },
      })
      const archived = await prisma.loyaltyCard.create({
        data: { businessId: business.id, name: "Archivada", reward: "Café", stampsRequired: 5, isActive: false, status: "ARCHIVED" },
      })
      const external = await prisma.loyaltyCard.create({
        data: { businessId: other.id, name: "Ajena", reward: "Café", stampsRequired: 5, isActive: true },
      })
      const legacyCount = nearRewardPreviewLimit + 2
      await prisma.customer.createMany({ data: [
        ...Array.from({ length: legacyCount }, (_, index) => ({ cardId: first.id, name: `Cliente ${index}`, stamps: 4 })),
        { cardId: first.id, name: "Inactivo", stamps: 4, isActive: false },
        { cardId: archived.id, name: "Archivado", stamps: 4 },
        { cardId: external.id, name: "Ajeno", stamps: 4 },
      ] })
      const member = await prisma.customer.create({
        data: { cardId: second.id, name: "Ciclo anterior", stamps: 2 },
      })
      const config = await prisma.cardConfiguration.create({
        data: { cardId: second.id, version: 1, stampsRequired: 3, reward: "Café", milestones: [] },
      })
      const cycle = await prisma.loyaltyCycle.create({
        data: { customerId: member.id, cardId: second.id, configurationId: config.id, balance: 2 },
      })
      await prisma.customer.update({ where: { id: member.id }, data: { currentCycleId: cycle.id } })

      const totals = await summarizeActiveCardCustomers(business.id)
      expect(totals).toHaveLength(2)
      expect(totals).toEqual(expect.arrayContaining([
        { cardId: first.id, _count: { _all: legacyCount }, _sum: { stamps: legacyCount * 4 } },
        { cardId: second.id, _count: { _all: 1 }, _sum: { stamps: 2 } },
      ]))
      const matches = await findNearRewardPreview(business.id)
      expect(matches).toHaveLength(nearRewardPreviewLimit)
      expect(matches.every(match => match.total === BigInt(legacyCount + 1))).toBe(true)
      expect(matches).toContainEqual({ id: member.id, nombre: member.name, tarjeta: second.name, total: BigInt(legacyCount + 1) })
    } finally {
      await prisma.business.deleteMany({ where: { id: { in: [business.id, other.id] } } })
    }
  })
})
