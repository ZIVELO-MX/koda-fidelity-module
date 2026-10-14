import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"
import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { ConflictError, NotFoundError, ValidationError } from "@/lib/api-utils"
import { activateManualSubscription, configurePrimaryCard, createCustomerProfile, deactivateManualSubscription, getEntitlements, scheduleClosure, syncExpiredEntitlements } from "../account-lifecycle"
import { ensureCategories, getOnboarding, saveDraft } from "../onboarding-service"

const integration = describe.skipIf(process.env.CI !== "true")

integration("account lifecycle PostgreSQL integration", () => {
  let businessId = ""
  let userId = ""
  let profileId = ""
  const extraBusinessIds: string[] = []

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
    await Promise.all(extraBusinessIds.splice(0).map((id) => prisma.business.delete({ where: { id } })))
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

  it("links a previously unclaimed card profile to its newly verified customer account", async () => {
    const email = `signup-customer-${randomUUID()}@test.invalid`
    const profile = await prisma.customerProfile.create({ data: { emailNormalized: email, name: "QR customer" } })
    profileId = profile.id
    const authUserId = randomUUID()

    const linked = await createCustomerProfile(prisma, { authUserId, email: email.toUpperCase(), name: "Verified customer" })

    expect(linked).toMatchObject({ id: profile.id, authUserId, emailNormalized: email, name: "Verified customer" })
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
    await expect(prisma.billingAuditEvent.findUniqueOrThrow({ where: { idempotencyKey: `trial-expired:${trial.id}` } })).resolves.toMatchObject({
      metadata: expect.objectContaining({ previousPlan: "PRO", effectivePlan: "LITE" }),
    })
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

  it("preserves the current billing period when applying a plan change", async () => {
    const periodStart = new Date("2026-10-01T00:00:00.000Z")
    const periodEnd = new Date("2027-10-01T00:00:00.000Z")
    await activateManualSubscription(prisma, {
      businessId, plan: "LITE", billingInterval: "ANNUAL", proAccessGranted: false,
      periodStart, periodEnd, idempotencyKey: randomUUID(),
    })

    const changeStartedAt = new Date()
    const changed = await activateManualSubscription(prisma, {
      businessId, plan: "PRO", billingInterval: "ANNUAL", action: "set_plan",
      periodStart, periodEnd, idempotencyKey: randomUUID(),
    })

    expect(changed.periodStart).toEqual(periodStart)
    expect(changed.periodEnd).toEqual(periodEnd)
    expect(changed.activatedAt.getTime()).toBeGreaterThanOrEqual(changeStartedAt.getTime())
    expect(changed.activatedAt.getTime()).toBeLessThanOrEqual(Date.now())
  })

  it("cancels active and past-due subscriptions, locks every non-archived card, and waits all members", async () => {
    const now = new Date()
    await activateManualSubscription(prisma, { businessId, plan: "PRO", idempotencyKey: randomUUID() })
    await prisma.subscription.create({
      data: {
        businessId,
        plan: "LITE",
        billingInterval: "MONTHLY",
        status: "PAST_DUE",
        amountMinor: 0,
        currency: "MXN",
        activatedAt: now,
        periodStart: now,
        periodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    })
    const cards = await prisma.loyaltyCard.createManyAndReturn({ data: [
      { businessId, name: "Active", reward: "R1", status: "ACTIVE", isActive: true, isLite: true },
      { businessId, name: "Draft", reward: "R2", status: "DRAFT", isActive: false, isLite: true },
      { businessId, name: "Locked", reward: "R3", status: "LOCKED_BY_PLAN", isActive: false, isLite: false },
      { businessId, name: "Archived", reward: "R4", status: "ARCHIVED", isActive: false, isLite: false },
    ] })
    const secondUser = await prisma.user.create({
      data: { name: "Second member", email: `member-${randomUUID()}@test.invalid`, authUserId: randomUUID(), businessId },
    })
    await prisma.onboardingProgress.create({ data: { userId: secondUser.id, businessId } })

    const result = await deactivateManualSubscription(prisma, {
      businessId, summary: "Cuenta inactiva", operator: "Support", idempotencyKey: randomUUID(),
    })

    expect(result).toMatchObject({ alreadyApplied: false, canceledSubscriptions: 2, lockedCards: 3, affectedUsers: 2 })
    expect(await prisma.subscription.count({ where: { businessId, status: "CANCELED" } })).toBe(2)
    const storedCards = await prisma.loyaltyCard.findMany({ where: { businessId }, orderBy: { createdAt: "asc" } })
    const archivedCardId = cards.find(({ name }) => name === "Archived")?.id
    expect(archivedCardId).toBeDefined()
    for (const card of storedCards.filter(({ id }) => id !== archivedCardId)) {
      expect(card).toMatchObject({ status: "LOCKED_BY_PLAN", isActive: false, isLite: false, effectiveThemeId: null })
    }
    expect(storedCards.find(({ id }) => id === archivedCardId)).toMatchObject({ status: "ARCHIVED", isActive: false })
    expect(await prisma.onboardingProgress.findMany({ where: { businessId } })).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId, step: "PAYWALL", status: "AWAITING_PAYMENT" }),
      expect.objectContaining({ userId: secondUser.id, step: "PAYWALL", status: "AWAITING_PAYMENT" }),
    ]))
  })

  it("does not repeat deactivation when the idempotency key is reused", async () => {
    await activateManualSubscription(prisma, { businessId, plan: "PRO", idempotencyKey: randomUUID() })
    await prisma.loyaltyCard.create({ data: { businessId, name: "Keep once", reward: "R1", status: "ACTIVE", isActive: true } })
    const idempotencyKey = randomUUID()
    const input = { businessId, summary: "Cuenta inactiva", operator: "Support", idempotencyKey }

    const first = await deactivateManualSubscription(prisma, input)
    const second = await deactivateManualSubscription(prisma, input)

    expect(first.alreadyApplied).toBe(false)
    expect(second).toMatchObject({ alreadyApplied: true, canceledSubscriptions: 0, lockedCards: 0, affectedUsers: 0 })
    expect(await prisma.billingAuditEvent.count({ where: { businessId, idempotencyKey } })).toBe(1)
    expect(await prisma.subscription.count({ where: { businessId, status: "CANCELED" } })).toBe(1)
    expect(await prisma.loyaltyCard.count({ where: { businessId, status: "LOCKED_BY_PLAN" } })).toBe(1)
  })

  it("rejects a deactivation key that already belongs to another business", async () => {
    const otherBusiness = await prisma.business.create({ data: { name: "Other business", email: `other-${randomUUID()}@test.invalid` } })
    extraBusinessIds.push(otherBusiness.id)
    const idempotencyKey = randomUUID()
    await prisma.billingAuditEvent.create({
      data: { businessId: otherBusiness.id, action: "deactivate_plan", operator: "Support", idempotencyKey },
    })

    await expect(deactivateManualSubscription(prisma, {
      businessId, summary: "Cuenta inactiva", operator: "Support", idempotencyKey,
    })).rejects.toBeInstanceOf(ConflictError)
    expect(await prisma.billingAuditEvent.count({ where: { businessId, idempotencyKey } })).toBe(0)
  })

  it("keeps a Pro theme selected while clearing the effective theme on Lite", async () => {
    const liteTheme = await prisma.loyaltyTheme.findFirstOrThrow({ where: { plan: "LITE", isActive: true }, orderBy: { code: "asc" } })
    const proTheme = await prisma.loyaltyTheme.findFirstOrThrow({ where: { plan: "PRO", isActive: true }, orderBy: { code: "asc" } })
    const cards = await prisma.loyaltyCard.createManyAndReturn({ data: [
      { businessId, name: "Existing Lite card", reward: "R0", selectedThemeId: liteTheme.id, effectiveThemeId: liteTheme.id, isLite: true },
      { businessId, name: "Themed one", reward: "R1", selectedThemeId: proTheme.id, effectiveThemeId: proTheme.id },
      { businessId, name: "Themed two", reward: "R2", selectedThemeId: liteTheme.id, effectiveThemeId: liteTheme.id },
    ] })

    const firstProKey = randomUUID()
    await activateManualSubscription(prisma, { businessId, plan: "PRO", idempotencyKey: firstProKey })
    expect((await prisma.loyaltyCard.findFirstOrThrow({ where: { businessId, selectedThemeId: proTheme.id } })).effectiveThemeId).toBe(proTheme.id)
    await configurePrimaryCard(prisma, businessId, cards[2].id)

    const liteKey = randomUUID()
    const lite = await activateManualSubscription(prisma, { businessId, plan: "LITE", proAccessGranted: false, idempotencyKey: liteKey })
    await expect(prisma.billingAuditEvent.findUniqueOrThrow({ where: { idempotencyKey: liteKey } })).resolves.toMatchObject({
      metadata: expect.objectContaining({ previousPlan: "PRO", effectivePlan: "LITE" }),
    })
    const refreshed = await prisma.loyaltyCard.findMany({ where: { businessId }, orderBy: { createdAt: "asc" } })
    expect(lite.liteCardId).toBeTruthy()
    expect(refreshed.filter((card) => card.status === "ACTIVE")).toHaveLength(1)
    const downgraded = refreshed.find((card) => card.selectedThemeId === proTheme.id)
    expect(refreshed.find((card) => card.id === cards[2].id)).toMatchObject({ status: "ACTIVE", isActive: true, isLite: true, effectiveThemeId: liteTheme.id })
    expect(downgraded).toMatchObject({ status: "LOCKED_BY_PLAN", isActive: false, selectedThemeId: proTheme.id, effectiveThemeId: null, brandColor: "#ff6b35" })
    expect(refreshed.filter((card) => card.status === "LOCKED_BY_PLAN")).toHaveLength(2)

    const restoredProKey = randomUUID()
    await activateManualSubscription(prisma, { businessId, plan: "PRO", idempotencyKey: restoredProKey })
    await expect(prisma.billingAuditEvent.findUniqueOrThrow({ where: { idempotencyKey: restoredProKey } })).resolves.toMatchObject({
      metadata: expect.objectContaining({ previousPlan: "LITE", effectivePlan: "PRO" }),
    })
    const upgraded = await prisma.loyaltyCard.findMany({ where: { businessId }, orderBy: { createdAt: "asc" } })
    const restored = upgraded.find((card) => card.id === cards[1].id)
    expect(restored).toMatchObject({ selectedThemeId: proTheme.id, effectiveThemeId: proTheme.id, status: "ACTIVE", isActive: true, isLite: false })
    expect(upgraded.every((card) => card.status === "ACTIVE" && card.isActive)).toBe(true)
    expect((await prisma.subscription.findFirstOrThrow({ where: { businessId, status: "ACTIVE" } })).liteCardId).toBe(cards[2].id)

    await configurePrimaryCard(prisma, businessId, cards[1].id)
    await activateManualSubscription(prisma, { businessId, plan: "LITE", proAccessGranted: false, idempotencyKey: randomUUID() })
    const litePrimaryProTheme = await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: cards[1].id } })
    expect(litePrimaryProTheme).toMatchObject({ selectedThemeId: proTheme.id, effectiveThemeId: null, status: "ACTIVE", isActive: true, isLite: true })

    await activateManualSubscription(prisma, { businessId, plan: "PRO", idempotencyKey: randomUUID() })
    await expect(prisma.loyaltyCard.findUniqueOrThrow({ where: { id: cards[1].id } })).resolves.toMatchObject({ selectedThemeId: proTheme.id, effectiveThemeId: proTheme.id, status: "ACTIVE", isActive: true, isLite: false })
  })

  it("lets Lite manually choose a previously locked card without changing archived cards or drafts", async () => {
    const proTheme = await prisma.loyaltyTheme.findFirstOrThrow({ where: { plan: "PRO", isActive: true }, orderBy: { code: "asc" } })
    const now = new Date()
    const current = await prisma.loyaltyCard.create({ data: { businessId, name: "Current", reward: "R0", isActive: true, isLite: true, status: "ACTIVE" } })
    const legacyLocked = await prisma.loyaltyCard.create({ data: { businessId, name: "Legacy locked", reward: "R1", selectedThemeId: proTheme.id, isActive: false, isLite: false, status: "LOCKED_BY_PLAN" } })
    const archived = await prisma.loyaltyCard.create({ data: { businessId, name: "Archived", reward: "R2", isActive: false, isLite: false, status: "ARCHIVED" } })
    const draft = await prisma.loyaltyCard.create({ data: { businessId, name: "Draft", reward: "R3", isActive: false, isLite: false, status: "DRAFT" } })
    await prisma.subscription.create({
      data: { businessId, plan: "LITE", billingInterval: "MONTHLY", status: "ACTIVE", amountMinor: 0, currency: "MXN", activatedAt: now, periodStart: now, periodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
    })

    await expect(configurePrimaryCard(prisma, businessId, archived.id)).rejects.toBeInstanceOf(ValidationError)
    await expect(configurePrimaryCard(prisma, businessId, draft.id)).rejects.toBeInstanceOf(ValidationError)
    await expect(configurePrimaryCard(prisma, businessId, randomUUID())).rejects.toBeInstanceOf(NotFoundError)
    await configurePrimaryCard(prisma, businessId, legacyLocked.id)

    await expect(prisma.subscription.findFirstOrThrow({ where: { businessId, status: "ACTIVE" } })).resolves.toMatchObject({ liteCardId: legacyLocked.id })
    await expect(prisma.loyaltyCard.findUniqueOrThrow({ where: { id: legacyLocked.id } })).resolves.toMatchObject({ status: "ACTIVE", isActive: true, isLite: true, selectedThemeId: proTheme.id, effectiveThemeId: null })
    await expect(prisma.loyaltyCard.findUniqueOrThrow({ where: { id: current.id } })).resolves.toMatchObject({ status: "LOCKED_BY_PLAN", isActive: false })
    await expect(prisma.loyaltyCard.findUniqueOrThrow({ where: { id: archived.id } })).resolves.toMatchObject({ status: "ARCHIVED", isActive: false })
    await expect(prisma.loyaltyCard.findUniqueOrThrow({ where: { id: draft.id } })).resolves.toMatchObject({ status: "DRAFT", isActive: false })
  })

  it("keeps the onboarding card unpublished until support activates the plan", async () => {
    const proTheme = await prisma.loyaltyTheme.findFirstOrThrow({ where: { plan: "PRO", isActive: true }, orderBy: { code: "asc" } })
    const draft = await prisma.loyaltyCard.create({ data: { businessId, name: "Onboarding", reward: "R1", selectedThemeId: proTheme.id, effectiveThemeId: proTheme.id, isActive: false, isLite: true, status: "DRAFT" } })
    await prisma.onboardingProgress.update({ where: { userId }, data: { firstCardId: draft.id } })
    expect(draft).toMatchObject({ status: "DRAFT", isActive: false, selectedThemeId: proTheme.id, effectiveThemeId: proTheme.id })

    await activateManualSubscription(prisma, { businessId, plan: "PRO", idempotencyKey: randomUUID() })

    await expect(prisma.loyaltyCard.findUniqueOrThrow({ where: { id: draft.id } })).resolves.toMatchObject({ status: "ACTIVE", isActive: true, selectedThemeId: proTheme.id, effectiveThemeId: proTheme.id })
    await expect(prisma.subscription.findFirstOrThrow({ where: { businessId, status: "ACTIVE" } })).resolves.toMatchObject({ liteCardId: draft.id })
    await expect(prisma.onboardingProgress.findFirstOrThrow({ where: { businessId } })).resolves.toMatchObject({ status: "ACTIVE", step: "PAYWALL" })
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
