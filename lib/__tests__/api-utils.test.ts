import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/supabase-server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
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
  handleApiError,
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
