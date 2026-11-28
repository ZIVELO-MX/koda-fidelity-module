import { afterEach, describe, expect, it, vi } from "vitest"
import { submitCardChange } from "../submit-card-change"

describe("confirmación de cambios de tarjeta", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function challenge() {
    return new Response(JSON.stringify({
      code: "KF-CARD-CONFIRMATION",
      confirmation: "server-token",
      error: "La tarjeta anterior quedará bloqueada",
    }), { status: 409 })
  }

  it("cancelar no reenvía la mutación", async () => {
    const fetchMock = vi.fn().mockResolvedValue(challenge())
    vi.stubGlobal("fetch", fetchMock)
    vi.spyOn(window, "confirm").mockReturnValue(false)

    expect(await submitCardChange("/api/cards", { method: "POST" })).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("reenvía el payload original con el token cuando el operador confirma", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(challenge()).mockResolvedValueOnce(new Response(null, { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    vi.spyOn(window, "confirm").mockReturnValue(true)
    const init = { method: "PUT", body: "{\"stampsRequired\":3}", headers: { "Content-Type": "application/json" } }

    expect((await submitCardChange("/api/cards/card", init))?.ok).toBe(true)
    const retry = fetchMock.mock.calls[1][1]
    expect(retry.body).toBe(init.body)
    expect(retry.headers.get("X-Confirm-Card-Change")).toBe("server-token")
    expect(retry.headers.get("Content-Type")).toBe("application/json")
  })
})
