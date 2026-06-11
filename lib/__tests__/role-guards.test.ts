import { describe, it, expect, vi } from "vitest"
import { ForbiddenError, requireRole } from "../api-utils"
import type { Role } from "@prisma/client"

vi.mock("@/lib/supabase-server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}))

function makeUser(role: Role) {
  return { id: "user-1", email: "test@test.com", name: "Test", role }
}

describe("requireRole — admin", () => {
  const admin = makeUser("admin")

  it("passes when admin is required", () => {
    expect(() => requireRole(admin, "admin")).not.toThrow()
  })

  it("passes when admin or sellador is allowed", () => {
    expect(() => requireRole(admin, "admin", "sellador")).not.toThrow()
  })

  it("throws ForbiddenError when only sellador is allowed", () => {
    expect(() => requireRole(admin, "sellador")).toThrow(ForbiddenError)
  })
})

describe("requireRole — sellador", () => {
  const sellador = makeUser("sellador")

  it("passes when sellador is required", () => {
    expect(() => requireRole(sellador, "sellador")).not.toThrow()
  })

  it("passes when admin or sellador is allowed", () => {
    expect(() => requireRole(sellador, "admin", "sellador")).not.toThrow()
  })

  it("throws ForbiddenError when only admin is required", () => {
    expect(() => requireRole(sellador, "admin")).toThrow(ForbiddenError)
  })

  it("ForbiddenError message includes the role name", () => {
    try {
      requireRole(sellador, "admin")
      expect.fail("Should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError)
      expect((err as ForbiddenError).message).toContain("sellador")
    }
  })
})
