import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }))
vi.mock("@/lib/supabase-req-res", () => ({
  createSupabaseReqResClient: (request: Request) => ({
    supabase: { auth: { getUser } },
    response: NextResponse.next({ request: { headers: request.headers } }),
  }),
}))

import { proxy } from "./proxy"

describe("request id proxy context", () => {
  beforeEach(() => getUser.mockResolvedValue({ data: { user: { id: "auth-1" } } }))

  it("preserves an incoming id on API responses", async () => {
    const response = await proxy(new NextRequest("http://localhost/api/customers", { headers: { "x-request-id": "proxy-incoming" } }))
    expect(response.headers.get("x-request-id")).toBe("proxy-incoming")
  })

  it("generates an id when the API request does not provide one", async () => {
    const response = await proxy(new NextRequest("http://localhost/api/customers"))
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/)
  })
})
