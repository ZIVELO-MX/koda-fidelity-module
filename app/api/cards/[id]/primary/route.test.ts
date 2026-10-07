import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const { requireWritableBusinessPrincipal, requireActivatedBusiness, syncExpiredEntitlements, configurePrimaryCard } = vi.hoisted(() => ({
  requireWritableBusinessPrincipal: vi.fn(),
  requireActivatedBusiness: vi.fn(),
  syncExpiredEntitlements: vi.fn(),
  configurePrimaryCard: vi.fn(),
}))

vi.mock("@/lib/api-utils", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")),
  requireWritableBusinessPrincipal,
  requireActivatedBusiness,
}))
vi.mock("@/lib/account-lifecycle", async () => ({
  ...(await vi.importActual<typeof import("@/lib/account-lifecycle")>("@/lib/account-lifecycle")),
  syncExpiredEntitlements,
  configurePrimaryCard,
}))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))

import { POST } from "./route"

const principal = {
  business: { id: "business-owned" },
  user: { id: "admin-owned", role: "admin" as const },
}

function request() {
  return new Request("http://localhost/api/cards/card-owned/primary", {
    method: "POST",
    headers: { "x-request-id": "request-test" },
  }) as NextRequest
}

describe("POST /api/cards/{id}/primary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireWritableBusinessPrincipal.mockResolvedValue(principal)
    requireActivatedBusiness.mockResolvedValue(undefined)
    syncExpiredEntitlements.mockResolvedValue(undefined)
    configurePrimaryCard.mockResolvedValue({ cardId: "card-owned", plan: "LITE" })
  })

  it("uses the authenticated business and returns the configured card", async () => {
    const response = await POST(request(), { params: Promise.resolve({ id: "card-owned" }) })

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(response.headers.get("x-request-id")).toBe("request-test")
    expect(syncExpiredEntitlements).toHaveBeenCalledWith(expect.anything(), "business-owned")
    expect(configurePrimaryCard).toHaveBeenCalledWith(expect.anything(), "business-owned", "card-owned")
    expect(await response.json()).toEqual({ success: true, cardId: "card-owned", plan: "LITE" })
  })

  it("requires an administrator", async () => {
    requireWritableBusinessPrincipal.mockResolvedValue({ ...principal, user: { ...principal.user, role: "member" } })

    const response = await POST(request(), { params: Promise.resolve({ id: "card-owned" }) })

    expect(response.status).toBe(403)
    expect(configurePrimaryCard).not.toHaveBeenCalled()
  })

  it("returns service validation errors through the API envelope", async () => {
    const { ValidationError } = await import("@/lib/api-utils")
    configurePrimaryCard.mockRejectedValue(new ValidationError("Solo puedes elegir una tarjeta publicada y no archivada"))

    const response = await POST(request(), { params: Promise.resolve({ id: "draft-card" }) })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "KF-REQUEST-001", requestId: "request-test" })
  })
})
