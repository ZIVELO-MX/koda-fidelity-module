import { Prisma, PrismaClient } from "@prisma/client"
import { randomUUID } from "node:crypto"
import { NotFoundError, ValidationError } from "@/lib/api-utils"
import { isExpired, type MilestoneRewardData } from "@/lib/card-utils"

type Db = PrismaClient

type OperationInput = {
  businessId: string
  customerId: string
  type: "stamp" | "redeem"
  idempotencyKey: string
}

type OperationResult = {
  customer: unknown
  event: "stamp" | "redeem"
  message: string
  milestoneClaim?: { id: string; label: string; iconName: string | null } | null
  operationId: string
  cycleId: string | null
}

const customerInclude = {
  card: { select: { id: true, businessId: true, name: true, stampsRequired: true, reward: true, expiresAt: true, milestoneRewards: { select: { id: true, stampNumber: true, label: true, iconName: true, probability: true } } } },
  currentCycle: { include: { configuration: true } },
} as const

function asMilestones(value: unknown): MilestoneRewardData[] {
  if (!Array.isArray(value)) return []
  return value as MilestoneRewardData[]
}

async function withSerializableRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
      if (!retryable || attempt === 2) throw error
    }
  }
  throw new Error("Serializable transaction retry exhausted")
}

export async function executeLoyaltyOperation(db: Db, input: OperationInput): Promise<OperationResult> {
  if (!input.idempotencyKey || input.idempotencyKey.length > 200) {
    throw new ValidationError("Idempotency-Key is required and must be at most 200 characters")
  }

  try {
    return await withSerializableRetry(() => db.$transaction(async tx => {
      const existing = await tx.loyaltyOperation.findUnique({
        where: { businessId_idempotencyKey: { businessId: input.businessId, idempotencyKey: input.idempotencyKey } },
      })
      if (existing) return existing.response as unknown as OperationResult

      const customer = await tx.customer.findUnique({ where: { id: input.customerId }, include: customerInclude })
      if (!customer || customer.card.businessId !== input.businessId || !customer.isActive) {
        throw new NotFoundError("Customer not found")
      }
      if (isExpired(customer.card.expiresAt)) throw new ValidationError("This loyalty card has expired")

      const now = new Date()
      let cycle = customer.currentCycle
      let configuration = cycle?.configuration ?? null

      if (!configuration) {
        configuration = await tx.cardConfiguration.findFirst({ where: { cardId: customer.card.id }, orderBy: { version: "desc" } })
        if (!configuration) {
          configuration = await tx.cardConfiguration.create({
            data: {
              cardId: customer.card.id,
              version: 1,
              stampsRequired: customer.card.stampsRequired,
              reward: customer.card.reward,
              milestones: customer.card.milestoneRewards,
            },
          })
        }
      }

      const operationId = randomUUID()
      let result: OperationResult

      if (input.type === "stamp") {
        const balance = cycle?.balance ?? customer.stamps
        if (balance >= configuration.stampsRequired) {
          throw new ValidationError("Customer has completed the card and must redeem first.")
        }
        const nextBalance = balance + 1
        if (!cycle) {
          cycle = await tx.loyaltyCycle.create({
            data: { customerId: customer.id, cardId: customer.card.id, configurationId: configuration.id, balance: nextBalance },
            include: { configuration: true },
          })
          await tx.customer.update({ where: { id: customer.id }, data: { stamps: nextBalance, currentCycleId: cycle.id } })
        } else {
          cycle = await tx.loyaltyCycle.update({ where: { id: cycle.id }, data: { balance: nextBalance }, include: { configuration: true } })
          await tx.customer.update({ where: { id: customer.id }, data: { stamps: nextBalance } })
        }

        await tx.stampLog.create({ data: { businessId: input.businessId, cardId: customer.card.id, customerId: customer.id, cycleId: cycle.id, type: "stamp", balanceAfter: nextBalance, stampsRequiredSnapshot: configuration.stampsRequired } })

        let milestoneClaim: OperationResult["milestoneClaim"] = null
        const milestones = asMilestones(configuration.milestones)
        const configuredMilestone = milestones.find(item => item.stampNumber === nextBalance)
        const randomRoll = configuredMilestone ? Math.random() * 100 : null
        const picked = configuredMilestone && randomRoll !== null && randomRoll < configuredMilestone.probability ? configuredMilestone : null
        if (configuredMilestone) {
          const milestone = customer.card.milestoneRewards.find(item => item.stampNumber === configuredMilestone.stampNumber)
          const auditMetadata = {
            configurationVersion: configuration.version,
            milestoneId: milestone?.id ?? null,
            milestoneLabel: configuredMilestone.label,
            milestoneIconName: configuredMilestone.iconName,
            probability: configuredMilestone.probability,
            randomRoll,
            outcome: picked ? "awarded" : "no_prize",
          }
          if (milestone && picked) {
            const claim = await tx.customerMilestoneClaim.create({ data: { customerId: customer.id, milestoneId: milestone.id, cardId: customer.card.id, label: picked.label, iconName: picked.iconName } })
            milestoneClaim = { id: claim.id, label: picked.label, iconName: picked.iconName }
            await tx.stampLog.create({ data: { businessId: input.businessId, cardId: customer.card.id, customerId: customer.id, cycleId: cycle.id, type: "milestone", balanceAfter: nextBalance, stampsRequiredSnapshot: configuration.stampsRequired, metadata: { ...auditMetadata, milestoneClaimId: claim.id } } })
          } else {
            await tx.stampLog.create({ data: { businessId: input.businessId, cardId: customer.card.id, customerId: customer.id, cycleId: cycle.id, type: "milestone", balanceAfter: nextBalance, stampsRequiredSnapshot: configuration.stampsRequired, metadata: auditMetadata } })
          }
        }

        if (nextBalance === configuration.stampsRequired) {
          await tx.loyaltyCycle.update({ where: { id: cycle.id }, data: { completedAt: now } })
          await tx.stampLog.create({ data: { businessId: input.businessId, cardId: customer.card.id, customerId: customer.id, cycleId: cycle.id, type: "completion", balanceAfter: nextBalance, stampsRequiredSnapshot: configuration.stampsRequired } })
        }

        const updated = await tx.customer.findUnique({ where: { id: customer.id }, include: { card: { select: { name: true, stampsRequired: true, reward: true } } } })
        result = { customer: updated, event: "stamp", message: `${customer.name} now has ${nextBalance} stamps`, milestoneClaim, operationId, cycleId: cycle.id }
      } else {
        const balance = cycle?.balance ?? customer.stamps
        if (balance < configuration.stampsRequired) throw new ValidationError(`Customer needs ${configuration.stampsRequired - balance} more stamps to redeem`)
        if (!cycle) {
          cycle = await tx.loyaltyCycle.create({ data: { customerId: customer.id, cardId: customer.card.id, configurationId: configuration.id, balance }, include: { configuration: true } })
        }
        await tx.loyaltyCycle.update({ where: { id: cycle.id }, data: { balance: 0, redeemedAt: now } })
        await tx.customer.update({ where: { id: customer.id }, data: { stamps: 0, currentCycleId: null } })
        await tx.stampLog.create({ data: { businessId: input.businessId, cardId: customer.card.id, customerId: customer.id, cycleId: cycle.id, type: "redeem", balanceAfter: 0, stampsRequiredSnapshot: configuration.stampsRequired, metadata: { reward: configuration.reward } } })
        const updated = await tx.customer.findUnique({ where: { id: customer.id }, include: { card: { select: { name: true, stampsRequired: true, reward: true } } } })
        result = { customer: updated, event: "redeem", message: `${customer.name} redeemed ${configuration.reward}`, operationId, cycleId: cycle.id }
      }

      const stableResult = JSON.parse(JSON.stringify(result)) as OperationResult
      await tx.loyaltyOperation.create({ data: { id: operationId, businessId: input.businessId, cardId: customer.card.id, customerId: customer.id, cycleId: result.cycleId, type: input.type, idempotencyKey: input.idempotencyKey, response: stableResult as unknown as Prisma.InputJsonValue } })
      return stableResult
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 }))
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.loyaltyOperation.findUnique({ where: { businessId_idempotencyKey: { businessId: input.businessId, idempotencyKey: input.idempotencyKey } } })
      if (existing) return existing.response as unknown as OperationResult
    }
    throw error
  }
}
