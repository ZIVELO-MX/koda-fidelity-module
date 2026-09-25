import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const { getBusinessFromSession, assertBusinessWritable, getLatestSubscriptionRequest, saveSubscriptionRequest } = vi.hoisted(() => ({
  getBusinessFromSession: vi.fn(),
  assertBusinessWritable: vi.fn(),
  getLatestSubscriptionRequest: vi.fn(),
  saveSubscriptionRequest: vi.fn(),
}))

vi.mock("@/lib/api-utils", async () => ({ ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")), getBusinessFromSession }))
vi.mock("@/lib/account-lifecycle", () => ({ assertBusinessWritable }))
vi.mock("@/lib/subscription-requests", async () => ({
  ...(await vi.importActual<typeof import("@/lib/subscription-requests")>("@/lib/subscription-requests")),
  getLatestSubscriptionRequest,
  saveSubscriptionRequest,
}))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))

import { GET, POST } from "./route"
import { UnauthorizedError } from "@/lib/api-utils"

const principal = { business: { id: "business-owned", name: "Pastelería Luna" }, user: { id: "user-owned", email: "owner@test.invalid" } }
const savedRequest = {
  ticketNumber: "KF-0123456789ABCDEF",
  plan: "PRO",
  billingInterval: "ANNUAL",
  status: "PENDING",
  requestedByUser: { email: "owner@test.invalid" },
  createdAt: new Date("2026-09-23T00:00:00.000Z"),
}

function request(method: "GET" | "POST", body?: unknown) {
  return new Request("http://localhost/api/subscription-requests", {
    method,
    headers: { "Content-Type": "application/json", "x-request-id": "request-test" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as NextRequest
}

describe("/api/subscription-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBusinessFromSession.mockResolvedValue(principal)
    getLatestSubscriptionRequest.mockResolvedValue(savedRequest)
    saveSubscriptionRequest.mockResolvedValue({ request: savedRequest, created: true })
  })

  it("creates a pending request from the session's business, without client-selected tenancy", async () => {
    const response = await POST(request("POST", { plan: "PRO", billingInterval: "ANNUAL" }))
    expect(response.status).toBe(201)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(response.headers.get("x-request-id")).toBe("request-test")
    expect(saveSubscriptionRequest).toHaveBeenCalledWith(expect.anything(), {
      plan: "PRO", billingInterval: "ANNUAL", businessId: "business-owned", requestedByUserId: "user-owned",
    })
    expect(await response.json()).toEqual({ request: {
      ticketNumber: savedRequest.ticketNumber,
      plan: "PRO",
      billingInterval: "ANNUAL",
      status: "PENDING",
      businessName: "Pastelería Luna",
      contactEmail: "owner@test.invalid",
      createdAt: "2026-09-23T00:00:00.000Z",
    } })
  })

  it("rejects a supplied business ID or incomplete request", async () => {
    for (const body of [{ plan: "PRO", billingInterval: "ANNUAL", businessId: "other-business" }, { plan: "LITE" }]) {
      const response = await POST(request("POST", body))
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ code: "KF-REQUEST-001", requestId: "request-test" })
    }
    expect(saveSubscriptionRequest).not.toHaveBeenCalled()
  })

  it("reads only the authenticated business and returns null when it has no request", async () => {
    getLatestSubscriptionRequest.mockResolvedValue(null)
    const response = await GET(request("GET"))
    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(getLatestSubscriptionRequest).toHaveBeenCalledWith(expect.anything(), "business-owned")
    expect(await response.json()).toEqual({ request: null })
  })

  it("requires a session for both methods", async () => {
    getBusinessFromSession.mockRejectedValue(new UnauthorizedError())
    expect((await GET(request("GET"))).status).toBe(401)
    expect((await POST(request("POST", { plan: "LITE", billingInterval: "MONTHLY" }))).status).toBe(401)
    expect(saveSubscriptionRequest).not.toHaveBeenCalled()
  })
})
