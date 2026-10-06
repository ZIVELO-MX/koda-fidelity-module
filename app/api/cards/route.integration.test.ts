import { afterAll, afterEach, describe, expect, it, vi } from "vitest"
import { prisma } from "@/lib/prisma"

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
})
