import { describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@prisma/client"
import {
  databaseHost,
  fidelityEnvFile,
  formatAdminLookup,
  parseFidelityEnvironment,
  queryAdminAccount,
} from "./fidelity-admin-query"

function makeDb() {
  const methods = {
    user: { findFirst: vi.fn() },
    business: { findUnique: vi.fn() },
    loyaltyCard: { groupBy: vi.fn().mockResolvedValue([]) },
    subscriptionRequest: { findMany: vi.fn().mockResolvedValue([]) },
  }
  return { client: methods as unknown as PrismaClient, methods }
}

describe("Fidelity admin query helpers", () => {
  it.each([
    ["DESARROLLO", "development"],
    ["dev", "development"],
    ["PRODUCCION", "production"],
    ["Production", "production"],
  ])("resolves environment %s", (input, expected) => {
    expect(parseFidelityEnvironment(input)).toBe(expected)
  })

  it("rejects unknown environments", () => {
    expect(() => parseFidelityEnvironment("preview")).toThrow("DESARROLLO o PRODUCCION")
  })

  it("selects a distinct local env file for each environment", () => {
    expect(fidelityEnvFile("development", "/app")).toBe("/app/.env.development.local")
    expect(fidelityEnvFile("production", "/app")).toBe("/app/.env.production.local")
  })

  it("shows only a database host, never credentials", () => {
    expect(databaseHost("postgresql://operator:super-secret@pool.example.com:6543/db")).toBe("pool.example.com:6543")
    expect(() => databaseHost("not a URL")).toThrow("DATABASE_URL")
  })

  it("normalizes the email and reports a missing admin without further queries", async () => {
    const { client, methods } = makeDb()
    methods.user.findFirst.mockResolvedValue(null)

    const result = await queryAdminAccount(client, "  OWNER@EXAMPLE.COM ")

    expect(result).toEqual({ kind: "not_found", email: "owner@example.com" })
    expect(methods.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: { equals: "owner@example.com", mode: "insensitive" } },
    }))
    expect(methods.business.findUnique).not.toHaveBeenCalled()
    expect(methods.loyaltyCard.groupBy).not.toHaveBeenCalled()
  })

  it("identifies a non-admin account and does not query business data", async () => {
    const { client, methods } = makeDb()
    methods.user.findFirst.mockResolvedValue({ email: "staff@example.com", name: "Staff", role: "sellador", businessId: "biz-1", onboardingProgress: null })

    const result = await queryAdminAccount(client, "staff@example.com")

    expect(result).toEqual({ kind: "not_admin", email: "staff@example.com", name: "Staff", role: "sellador" })
    expect(methods.business.findUnique).not.toHaveBeenCalled()
  })

  it("shows onboarding progress for an admin who has no linked business", async () => {
    const { client, methods } = makeDb()
    const updatedAt = new Date("2026-10-05T12:00:00.000Z")
    methods.user.findFirst.mockResolvedValue({
      email: "new@example.com", name: "New Admin", role: "admin", businessId: null,
      onboardingProgress: { step: "CARD", status: "IN_PROGRESS", updatedAt },
    })

    const result = await queryAdminAccount(client, "new@example.com")

    expect(result).toEqual({
      kind: "onboarding", email: "new@example.com", name: "New Admin",
      step: "CARD", status: "IN_PROGRESS", updatedAt,
    })
    expect(methods.business.findUnique).not.toHaveBeenCalled()
    expect(formatAdminLookup(result)).toContain("Onboarding: CARD · IN_PROGRESS")
  })

  it("summarizes a linked business, plan, invitations, cards, and pending activation requests", async () => {
    const { client, methods } = makeDb()
    const now = new Date("2026-10-05T12:00:00.000Z")
    const start = new Date("2026-10-01T00:00:00.000Z")
    const end = new Date("2026-11-01T00:00:00.000Z")
    const trialEnd = new Date("2026-10-20T00:00:00.000Z")
    methods.user.findFirst.mockResolvedValue({
      email: "admin@example.com", name: "Admin", role: "admin", businessId: "biz-1", onboardingProgress: null,
    })
    methods.business.findUnique.mockResolvedValue({
      id: "biz-1", name: "Café Luna", email: "contact@example.com", createdAt: start,
      users: [
        { name: "Admin", email: "admin@example.com", role: "admin" },
        { name: "Staff", email: "staff@example.com", role: "sellador" },
      ],
      invitations: [{ name: "Invited", email: "invite@example.com", role: "sellador", expiresAt: end }],
      subscriptions: [{
        status: "ACTIVE", plan: "LITE", billingInterval: "MONTHLY", periodStart: start,
        periodEnd: end, proTrialEndsAt: trialEnd, proAccessGranted: true,
      }],
    })
    methods.loyaltyCard.groupBy.mockResolvedValue([
      { status: "ACTIVE", _count: { _all: 1 } },
      { status: "DRAFT", _count: { _all: 2 } },
    ])
    methods.subscriptionRequest.findMany.mockResolvedValue([
      { ticketNumber: "KF-123", plan: "PRO", billingInterval: "ANNUAL", createdAt: start },
    ])

    const result = await queryAdminAccount(client, "admin@example.com", now)

    expect(result.kind).toBe("business")
    if (result.kind !== "business") throw new Error("Expected a business summary")
    expect(result.effectivePlan).toBe("PRO")
    expect(result.cardCounts).toEqual({ ACTIVE: 1, DRAFT: 2, LOCKED_BY_PLAN: 0, ARCHIVED: 0 })
    expect(result.members).toHaveLength(2)
    expect(result.invitations).toHaveLength(1)
    expect(result.pendingRequests[0]?.ticketNumber).toBe("KF-123")
    expect(methods.loyaltyCard.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ["status"] }))
    expect(methods.subscriptionRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { businessId: "biz-1", status: "PENDING" } }))

    const output = formatAdminLookup(result)
    expect(output).toContain("Acceso efectivo: PRO")
    expect(output).toContain("1 activas, 2 borradores")
    expect(output).toContain("KF-123")
    expect(output).not.toContain("clientes")
  })

  it("does not grant effective Pro after the trial expires", async () => {
    const { client, methods } = makeDb()
    const now = new Date("2026-11-01T00:00:00.000Z")
    methods.user.findFirst.mockResolvedValue({ email: "admin@example.com", name: "Admin", role: "admin", businessId: "biz-1", onboardingProgress: null })
    methods.business.findUnique.mockResolvedValue({
      id: "biz-1", name: "Café Luna", email: "contact@example.com", createdAt: now,
      users: [], invitations: [],
      subscriptions: [{
        status: "ACTIVE", plan: "LITE", billingInterval: "MONTHLY", periodStart: now,
        periodEnd: new Date("2026-12-01T00:00:00.000Z"), proTrialEndsAt: now, proAccessGranted: true,
      }],
    })

    const result = await queryAdminAccount(client, "admin@example.com", now)

    expect(result.kind).toBe("business")
    if (result.kind === "business") expect(result.effectivePlan).toBe("LITE")
  })
})
