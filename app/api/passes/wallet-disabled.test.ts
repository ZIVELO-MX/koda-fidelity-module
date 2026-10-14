import { describe, expect, it, beforeEach, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/passes/apple", () => ({ generateLoyaltyPass: vi.fn() }))
vi.mock("@/lib/passes/google", () => ({
  generateLoyaltyPassJwt: vi.fn(),
  getSaveUrl: vi.fn(),
  isConfigured: vi.fn(),
  getConfigError: vi.fn(),
}))

import { POST as applePost } from "./apple/[cardId]/route"
import { POST as googlePost } from "./google/[cardId]/route"

describe("disabled Wallet endpoints", () => {
  beforeEach(() => { delete process.env.FID_WALLET_ENABLED })

  it.each([
    ["Apple", applePost],
    ["Google", googlePost],
  ])("returns 501 for %s without touching issuance", async (_name, handler) => {
    const response = await handler(
      new Request("http://localhost/api/passes/card-1", { headers: { "x-request-id": "wallet-test-1" } }) as never,
      { params: Promise.resolve({ cardId: "card-1" }) },
    )
    expect(response.status).toBe(501)
    expect(response.headers.get("x-request-id")).toBe("wallet-test-1")
    await expect(response.json()).resolves.toMatchObject({ code: "KF-BILLING-004" })
  })
})
