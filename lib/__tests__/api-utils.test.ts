import { describe, it, expect, vi } from "vitest"

const { findActiveSubscription, findPendingProgress } = vi.hoisted(() => ({
  findActiveSubscription: vi.fn(),
  findPendingProgress: vi.fn(),
}))

vi.mock("@/lib/supabase-server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: {
  subscription: { findFirst: findActiveSubscription },
  onboardingProgress: { findFirst: findPendingProgress },
} }))
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}))

import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ProThemeRequiresProError,
  OnboardingActivationRequiredError,
  requireActivatedBusiness,
  handleApiError,
  withApiContext,
} from "../api-utils"

describe("api-utils error classes", () => {
  it("UnauthorizedError has correct name and message", () => {
    const err = new UnauthorizedError()
    expect(err.name).toBe("UnauthorizedError")
    expect(err.message).toBe("Unauthorized")
  })

  it("NotFoundError has correct name and custom message", () => {
    const err = new NotFoundError("Business not found")
    expect(err.name).toBe("NotFoundError")
    expect(err.message).toBe("Business not found")
  })

  it("ValidationError has correct name and custom message", () => {
    const err = new ValidationError("Invalid input")
    expect(err.name).toBe("ValidationError")
    expect(err.message).toBe("Invalid input")
  })

  it("ForbiddenError has correct name and default message", () => {
    const err = new ForbiddenError()
    expect(err.name).toBe("ForbiddenError")
    expect(err.message).toBe("Forbidden")
  })

  it("ForbiddenError accepts custom message", () => {
    const err = new ForbiddenError("Role not allowed")
    expect(err.message).toBe("Role not allowed")
  })
})

describe("handleApiError", () => {
  it("returns 401 for UnauthorizedError", () => {
    const response = handleApiError(new UnauthorizedError())
    expect(response.status).toBe(401)
  })

  it("returns 403 for ForbiddenError", () => {
    const response = handleApiError(new ForbiddenError())
    expect(response.status).toBe(403)
  })

  it("returns support instructions when Lite cannot save a Pro theme", async () => {
    const response = handleApiError(new ProThemeRequiresProError(), "request-pro-theme")
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ code: "KF-PLAN-PRO-THEME", supportEmail: "soporte@zivelo.dev", requestId: "request-pro-theme", retryable: false })
  })

  it("sends inactive accounts back to onboarding", async () => {
    const response = handleApiError(new OnboardingActivationRequiredError(), "request-activation")
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ code: "KF-ACCOUNT-ACTIVATION", redirectTo: "/onboarding", requestId: "request-activation", retryable: false })
  })

  it("returns 404 for NotFoundError", () => {
    const response = handleApiError(new NotFoundError("Not found"))
    expect(response.status).toBe(404)
  })

  it("returns 400 for ValidationError", () => {
    const response = handleApiError(new ValidationError("Bad input"))
    expect(response.status).toBe(400)
  })

  it("returns 500 for unknown errors", () => {
    const response = handleApiError(new Error("Unexpected"))
    expect(response.status).toBe(500)
  })
})

describe("requireActivatedBusiness", () => {
  it("requires activation when onboarding is pending and there is no active plan", async () => {
    findActiveSubscription.mockResolvedValue(null)
    findPendingProgress.mockResolvedValue({ id: "progress-1" })

    await expect(requireActivatedBusiness("business-1")).rejects.toBeInstanceOf(OnboardingActivationRequiredError)
  })

  it("lets a business with an active subscription pass", async () => {
    findActiveSubscription.mockResolvedValue({ id: "subscription-1" })
    findPendingProgress.mockResolvedValue({ id: "progress-1" })

    await expect(requireActivatedBusiness("business-1")).resolves.toBeUndefined()
  })

  it("currently lets a business with no subscription and no pending onboarding pass", async () => {
    findActiveSubscription.mockResolvedValue(null)
    findPendingProgress.mockResolvedValue(null)

    await expect(requireActivatedBusiness("business-1")).resolves.toBeUndefined()
  })
})

describe("withApiContext", () => {
  it("preserves an incoming request id", async () => {
    const response = await withApiContext(
      new Request("http://localhost", { headers: { "x-request-id": "req-client-1" } }),
      async () => new Response("ok"),
    )()
    expect(response.headers.get("x-request-id")).toBe("req-client-1")
    expect(await response.text()).toBe("ok")
  })

  it("generates a request id when the client did not send one", async () => {
    const response = await withApiContext(new Request("http://localhost"), async () => new Response("ok"))()
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("maps handler errors and keeps the same request id", async () => {
    const response = await withApiContext(
      new Request("http://localhost", { headers: { "x-request-id": "req-error-1" } }),
      async () => { throw new UnauthorizedError() },
    )()
    expect(response.status).toBe(401)
    expect(response.headers.get("x-request-id")).toBe("req-error-1")
    expect(await response.json()).toMatchObject({ requestId: "req-error-1" })
  })
})
