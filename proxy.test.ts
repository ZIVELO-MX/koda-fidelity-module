import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const { getUser, createClient } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createClient: vi.fn((request: Request) => ({
    supabase: { auth: { getUser } },
    response: NextResponse.next({ request: { headers: request.headers } }),
  })),
}))
vi.mock("@/lib/supabase-req-res", () => ({
  createSupabaseReqResClient: createClient,
}))

import { proxy } from "./proxy"

describe("request id proxy context", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUser.mockResolvedValue({ data: { user: { id: "auth-1" } } })
  })

  it("keeps the landing static by skipping Supabase on root requests", async () => {
    const response = await proxy(new NextRequest("http://localhost/"))

    expect(response.status).toBe(200)
    expect(createClient).not.toHaveBeenCalled()
    expect(getUser).not.toHaveBeenCalled()
  })

  it("forwards root auth callbacks without contacting Supabase", async () => {
    const response = await proxy(new NextRequest("http://localhost/?code=auth-code&next=%2Fdashboard"))

    expect(response.headers.get("location")).toBe(
      "http://localhost/auth/callback?code=auth-code&next=%2Fdashboard",
    )
    expect(createClient).not.toHaveBeenCalled()
  })

  it("preserves an incoming id on API responses", async () => {
    const response = await proxy(new NextRequest("http://localhost/api/customers", { headers: { "x-request-id": "proxy-incoming" } }))
    expect(response.headers.get("x-request-id")).toBe("proxy-incoming")
  })

  it("generates an id when the API request does not provide one", async () => {
    const response = await proxy(new NextRequest("http://localhost/api/customers"))
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/)
  })
})
