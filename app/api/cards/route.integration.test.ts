import { afterAll, afterEach, describe, expect, it, vi } from "vitest"
import { prisma } from "@/lib/prisma"
import { activateManualSubscription } from "@/lib/account-lifecycle"

const { getBusinessFromSession, requireWritableBusinessPrincipal } = vi.hoisted(() => ({
  getBusinessFromSession: vi.fn(),
  requireWritableBusinessPrincipal: vi.fn(),
}))

vi.mock("@/lib/api-utils", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")),
  getBusinessFromSession,
  requireWritableBusinessPrincipal,
}))

import { GET as listCards, POST as createCard } from "./route"
import { DELETE as deleteCard, GET as getCard, PUT as updateCard } from "./[id]/route"

const integration = describe.skipIf(process.env.CI !== "true")

integration("Cards API CRUD contract", () => {
  const businessIds: string[] = []

  afterEach(async () => {
    await Promise.all(businessIds.splice(0).map((id) => prisma.business.delete({ where: { id } })))
    vi.clearAllMocks()
  })

  afterAll(async () => prisma.$disconnect())

  it("creates, reads, updates, and deletes a card", async () => {
    const suffix = crypto.randomUUID()
    const business = await prisma.business.create({
      data: { name: "Cards API CRUD", email: `cards-api-${suffix}@test.invalid` },
    })
    businessIds.push(business.id)
    await activateManualSubscription(prisma, {
      businessId: business.id,
      plan: "PRO",
      idempotencyKey: `cards-crud-fixture:${suffix}`,
    })

    const principal = {
      business,
      user: {
        id: `admin-${suffix}`,
        email: business.email,
        name: "Cards API test admin",
        role: "admin" as const,
        passwordSetupRequired: false,
      },
    }
    getBusinessFromSession.mockResolvedValue(principal)
    requireWritableBusinessPrincipal.mockResolvedValue(principal)

    const createdResponse = await createCard(new Request("http://localhost/api/cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test card", reward: "Test reward" }),
    }) as never)
    expect(createdResponse.status).toBe(201)
    const createdBody = await createdResponse.json()
    const cardId = createdBody.card.id as string
    expect(createdBody.card).toMatchObject({ name: "Test card", reward: "Test reward" })

    const listResponse = await listCards(new Request("http://localhost/api/cards") as never)
    expect(listResponse.status).toBe(200)
    expect((await listResponse.json()).cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: cardId, name: "Test card", reward: "Test reward" }),
    ]))

    const itemParams = { params: Promise.resolve({ id: cardId }) }
    const readResponse = await getCard(new Request(`http://localhost/api/cards/${cardId}`) as never, itemParams)
    expect(readResponse.status).toBe(200)
    expect((await readResponse.json()).card).toMatchObject({ id: cardId, name: "Test card", reward: "Test reward" })

    const updateResponse = await updateCard(new Request(`http://localhost/api/cards/${cardId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Updated test card", reward: "Updated test reward" }),
    }) as never, itemParams)
    expect(updateResponse.status).toBe(200)
    expect((await updateResponse.json()).card).toMatchObject({ id: cardId, name: "Updated test card", reward: "Updated test reward" })
    await expect(prisma.loyaltyCard.findUnique({ where: { id: cardId } })).resolves.toMatchObject({
      name: "Updated test card",
      reward: "Updated test reward",
    })

    const deleteResponse = await deleteCard(new Request(`http://localhost/api/cards/${cardId}?permanent=true`, {
      method: "DELETE",
    }) as never, itemParams)
    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toEqual({ success: true })
    await expect(prisma.loyaltyCard.findUnique({ where: { id: cardId } })).resolves.toBeNull()

    const missingResponse = await getCard(new Request(`http://localhost/api/cards/${cardId}`) as never, itemParams)
    expect(missingResponse.status).toBe(404)
  }, 30_000)

  it("keeps an earned surprise claim and its stamp log when PUT removes the surprise", async () => {
    const suffix = crypto.randomUUID()
    const business = await prisma.business.create({
      data: { name: "Preserve claims", email: `claims-${suffix}@test.invalid` },
    })
    businessIds.push(business.id)
    await activateManualSubscription(prisma, {
      businessId: business.id,
      plan: "PRO",
      idempotencyKey: `claims-fixture:${suffix}`,
    })
    const card = await prisma.loyaltyCard.create({
      data: {
        businessId: business.id,
        name: "Claim card",
        reward: "Coffee",
        stampsRequired: 5,
        milestoneRewards: { create: [{ stampNumber: 3, label: "Pan dulce", iconName: "cookie", probability: 100 }] },
      },
      include: { milestoneRewards: true },
    })
    const customer = await prisma.customer.create({ data: { name: "Claim customer", cardId: card.id } })
    const milestone = card.milestoneRewards[0]
    const claim = await prisma.customerMilestoneClaim.create({
      data: {
        customerId: customer.id,
        milestoneId: milestone.id,
        stampNumberSnapshot: milestone.stampNumber,
        cardId: card.id,
        label: milestone.label,
        iconName: milestone.iconName,
      },
    })
    const stampLog = await prisma.stampLog.create({
      data: {
        businessId: business.id,
        cardId: card.id,
        customerId: customer.id,
        type: "milestone",
        balanceAfter: milestone.stampNumber,
        stampsRequiredSnapshot: card.stampsRequired,
        metadata: { outcome: "awarded", milestoneClaimId: claim.id },
      },
    })
    const principal = {
      business,
      user: {
        id: `admin-${suffix}`,
        email: business.email,
        name: "Claims admin",
        role: "admin" as const,
        passwordSetupRequired: false,
      },
    }
    getBusinessFromSession.mockResolvedValue(principal)
    requireWritableBusinessPrincipal.mockResolvedValue(principal)

    const response = await updateCard(new Request(`http://localhost/api/cards/${card.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ milestoneRewards: [] }),
    }) as never, { params: Promise.resolve({ id: card.id }) })

    expect(response.status).toBe(200)
    expect(await prisma.milestoneReward.findUnique({ where: { id: milestone.id } })).toBeNull()
    await expect(prisma.customerMilestoneClaim.findUnique({ where: { id: claim.id } })).resolves.toMatchObject({
      id: claim.id,
      milestoneId: null,
      stampNumberSnapshot: 3,
      label: "Pan dulce",
      iconName: "cookie",
    })
    await expect(prisma.stampLog.findUnique({ where: { id: stampLog.id } })).resolves.toMatchObject({
      metadata: { outcome: "awarded", milestoneClaimId: claim.id },
    })
  }, 30_000)

  // Cada UPDATE chocaba con la fila que todavía ocupaba ese número y el
  // índice único (cardId, stampNumber) respondía P2002 como 500.
  it("swaps two milestones' stamp numbers", async () => {
    const suffix = crypto.randomUUID()
    const business = await prisma.business.create({
      data: { name: "Cards API swap", email: `cards-swap-${suffix}@test.invalid` },
    })
    businessIds.push(business.id)
    await activateManualSubscription(prisma, { businessId: business.id, plan: "PRO", idempotencyKey: `cards-swap-fixture:${suffix}` })
    const principal = {
      business,
      user: { id: `admin-${suffix}`, email: business.email, name: "Swap admin", role: "admin" as const, passwordSetupRequired: false },
    }
    getBusinessFromSession.mockResolvedValue(principal)
    requireWritableBusinessPrincipal.mockResolvedValue(principal)

    const created = await (await createCard(new Request("http://localhost/api/cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Swap", reward: "Café", milestoneRewards: [
        { stampNumber: 3, label: "Pan", probability: 100 },
        { stampNumber: 5, label: "Galleta", probability: 100 },
      ] }),
    }) as never)).json()
    const [pan, galleta] = created.milestoneRewards as Array<{ id: string; label: string }>

    const response = await updateCard(new Request(`http://localhost/api/cards/${created.card.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ milestoneRewards: [
        { id: pan.id, stampNumber: 5, label: "Pan", probability: 100 },
        { id: galleta.id, stampNumber: 3, label: "Galleta", probability: 100 },
      ] }),
    }) as never, { params: Promise.resolve({ id: created.card.id }) })

    expect(response.status).toBe(200)
    await expect(prisma.milestoneReward.findMany({ where: { cardId: created.card.id }, orderBy: { stampNumber: "asc" }, select: { label: true, stampNumber: true } }))
      .resolves.toEqual([{ label: "Galleta", stampNumber: 3 }, { label: "Pan", stampNumber: 5 }])
  }, 30_000)
})
