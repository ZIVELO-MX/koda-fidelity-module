import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { AccountClosurePanel } from "../account-closure-panel"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("AccountClosurePanel", () => {
  it.each([
    [null, /contacta a soporte para solicitar el cierre/i],
    [{ scheduledFor: "2026-12-01" }, /la cuenta está en solo lectura/i],
  ])("orienta al administrador a soporte sin ofrecer cambios directos", async (scheduledClosure, message) => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ scheduledClosure }))
    vi.stubGlobal("fetch", fetch)
    render(<AccountClosurePanel />)

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledExactlyOnceWith("/api/account/deletion-impact", {
      signal: expect.any(AbortSignal),
    })
  })
})
