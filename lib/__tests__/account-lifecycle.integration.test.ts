import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"
import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { ConflictError } from "@/lib/api-utils"
import { activateManualSubscription, createCustomerProfile, getEntitlements, scheduleClosure, syncExpiredEntitlements } from "../account-lifecycle"
import { ensureCategories, getOnboarding, saveDraft } from "../onboarding-service"

const integration = describe.skipIf(process.env.CI !== "true")

integration("account lifecycle PostgreSQL integration", () => {
  let businessId = ""
  let userId = ""
  let profileId = ""

  beforeEach(async () => {
    const business = await prisma.business.create({ data: { name: "Lifecycle Test", email: `lifecycle-${Date.now()}-${Math.random()}@test.invalid` } })
    const user = await prisma.user.create({ data: { name: "Lifecycle User", email: business.email, authUserId: randomUUID(), businessId: business.id } })
    businessId = business.id
    userId = user.id
    await prisma.onboardingProgress.create({ data: { userId, businessId } })
    await ensureCategories(prisma)
  })

  afterAll(async () => { await prisma.$disconnect() })
  afterEach(async () => {
    if (profileId) await prisma.customerProfile.delete({ where: { id: profileId } })
    if (businessId) await prisma.business.delete({ where: { id: businessId } })
    businessId = ""
    userId = ""
    profileId = ""
  })

  it("rejects a stale draft and allows only one concurrent writer", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const input = { draftVersion: 0, business: { name: "Updated" } }
    const writes = await Promise.allSettled([saveDraft(prisma, user.authUserId!, input), saveDraft(prisma, user.authUserId!, input)])
    expect(writes.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    expect(writes.find((result) => result.status === "rejected")?.reason).toBeInstanceOf(ConflictError)
  })

  it("stores, expires and audits the included Pro month exactly once", async () => {
    const card = await prisma.loyaltyCard.createManyAndReturn({ data: [
      { businessId, name: "One", reward: "R1", isActive: false, isLite: true },
      { businessId, name: "Two", reward: "R2", isActive: false, isLite: false },
    ] })
    const periodStart = new Date("2026-01-31T12:00:00.000Z")
    const trialEndsAt = new Date("2026-02-28T12:00:00.000Z")
    const trial = await activateManualSubscription(prisma, { businessId, plan: "LITE", billingInterval: "MONTHLY", periodStart })
    expect(trial.proTrialEndsAt).toEqual(trialEndsAt)
    expect(await getEntitlements(prisma, businessId, new Date("2026-02-28T11:59:59.999Z"))).toMatchObject({ plan: "PRO", trial: true })
    expect(await getEntitlements(prisma, businessId, trialEndsAt)).toMatchObject({ plan: "LITE", trial: false })

    await syncExpiredEntitlements(prisma, businessId, trialEndsAt)
    await syncExpiredEntitlements(prisma, businessId, new Date("2026-03-01T00:00:00.000Z"))
    const expired = await prisma.subscription.findUniqueOrThrow({ where: { id: trial.id } })
    expect(expired.proAccessGranted).toBe(false)
    expect(await prisma.billingAuditEvent.count({ where: { idempotencyKey: `trial-expired:${trial.id}` } })).toBe(1)
    expect(await prisma.loyaltyCard.count({ where: { businessId, status: "ACTIVE" } })).toBe(1)
    expect(await prisma.loyaltyCard.count({ where: { businessId, status: "LOCKED_BY_PLAN" } })).toBe(1)

    const email = `person-${businessId}@example.com`
    const profile = await createCustomerProfile(prisma, { email, name: "Person", authUserId: randomUUID() })
    profileId = profile.id
    await expect(createCustomerProfile(prisma, { email: email.toUpperCase(), name: "Other", authUserId: randomUUID() })).rejects.toBeInstanceOf(ConflictError)
    const closure = await scheduleClosure(prisma, businessId, new Date("2026-01-31T00:00:00.000Z"))
    expect(closure.scheduledFor.toISOString()).toBe("2026-03-02T00:00:00.000Z")
    expect(card).toHaveLength(2)
  }, 15_000)

  it("keeps a Pro theme selected while clearing the effective theme on Lite", async () => {
    const liteTheme = await prisma.loyaltyTheme.findFirstOrThrow({ where: { plan: "LITE", isActive: true }, orderBy: { code: "asc" } })
    const proTheme = await prisma.loyaltyTheme.findFirstOrThrow({ where: { plan: "PRO", isActive: true }, orderBy: { code: "asc" } })
    const cards = await prisma.loyaltyCard.createManyAndReturn({ data: [
      { businessId, name: "Themed one", reward: "R1", selectedThemeId: proTheme.id, effectiveThemeId: proTheme.id },
      { businessId, name: "Themed two", reward: "R2", selectedThemeId: liteTheme.id, effectiveThemeId: liteTheme.id },
    ] })

    await activateManualSubscription(prisma, { businessId, plan: "PRO", idempotencyKey: randomUUID() })
    expect((await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: cards[0].id } })).effectiveThemeId).toBe(proTheme.id)

    const lite = await activateManualSubscription(prisma, { businessId, plan: "LITE", proAccessGranted: false, idempotencyKey: randomUUID() })
    const refreshed = await prisma.loyaltyCard.findMany({ where: { businessId }, orderBy: { createdAt: "asc" } })
    expect(lite.liteCardId).toBeTruthy()
    expect(refreshed.filter((card) => card.status === "ACTIVE")).toHaveLength(1)
    const downgraded = refreshed.find((card) => card.selectedThemeId === proTheme.id)
    expect(downgraded?.selectedThemeId).toBe(proTheme.id)
    expect(downgraded?.effectiveThemeId).toBeNull()
    expect(downgraded?.brandColor).toBe("#ff6b35")
    expect(refreshed.filter((card) => card.status === "LOCKED_BY_PLAN")).toHaveLength(1)
  })

  it("seeds the real Lite and Pro theme catalog", async () => {
    expect(await prisma.loyaltyTheme.count({ where: { plan: "LITE", isActive: true } })).toBe(13)
    expect(await prisma.loyaltyTheme.count({ where: { plan: "PRO", isActive: true } })).toBe(4)
  })

  it("creates resumable onboarding state with the exact persisted version", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const state = await getOnboarding(prisma, user.authUserId!)
    expect(state.onboardingProgress?.draftVersion).toBe(0)
    await saveDraft(prisma, user.authUserId!, { draftVersion: 0, card: { reward: "Coffee" } })
    expect((await getOnboarding(prisma, user.authUserId!)).onboardingProgress?.draftVersion).toBe(1)
  })
})
