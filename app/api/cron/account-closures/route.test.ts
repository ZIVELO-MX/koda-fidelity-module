import { afterEach, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"
import { POST } from "./route"

afterEach(() => vi.unstubAllEnvs())

it("rechaza el cierre automático aunque el scheduler tenga su credencial", async () => {
  vi.stubEnv("CRON_SECRET", "cron-secret")
  const request = new Request("http://localhost/api/cron/account-closures", {
    method: "POST",
    headers: { authorization: "Bearer cron-secret", "x-request-id": "req-test" },
  }) as NextRequest
  const response = await POST(request)
  expect(response.status).toBe(410)
  expect(response.headers.get("x-request-id")).toBe("req-test")
  expect(await response.json()).toMatchObject({ code: "KF-ACCOUNT-CLOSURE-MANUAL", retryable: false })
})
