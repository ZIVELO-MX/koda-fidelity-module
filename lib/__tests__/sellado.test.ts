import { beforeEach, describe, expect, it, vi } from "vitest"
import { ejecutarSellado, olvidarClavesDeSellado, SelladoIncierto } from "@/lib/sellado"

const respuesta = (status: number, body: unknown = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers({ "x-request-id": "req-1" }),
  json: async () => body,
})

const claveDe = (llamada: unknown[]) =>
  ((llamada[1] as RequestInit).headers as Record<string, string>)["Idempotency-Key"]

describe("ejecutarSellado", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    olvidarClavesDeSellado()
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  it("manda Idempotency-Key, que el motor de lealtad exige", async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, { event: "stamp" }))
    await ejecutarSellado("cust-1", "stamp")
    expect(claveDe(fetchMock.mock.calls[0])).toBeTruthy()
  })

  it("reintentar tras un 500 reusa la misma clave: el servidor pudo haberlo aplicado", async () => {
    fetchMock.mockResolvedValueOnce(respuesta(500))
    await expect(ejecutarSellado("cust-1", "stamp")).rejects.toBeInstanceOf(SelladoIncierto)

    fetchMock.mockResolvedValueOnce(respuesta(200, { event: "stamp" }))
    await ejecutarSellado("cust-1", "stamp")

    expect(claveDe(fetchMock.mock.calls[0])).toBe(claveDe(fetchMock.mock.calls[1]))
  })

  it("reintentar tras caerse la red reusa la misma clave", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    await expect(ejecutarSellado("cust-1", "stamp")).rejects.toBeInstanceOf(SelladoIncierto)

    fetchMock.mockResolvedValueOnce(respuesta(200, { event: "stamp" }))
    await ejecutarSellado("cust-1", "stamp")

    expect(claveDe(fetchMock.mock.calls[0])).toBe(claveDe(fetchMock.mock.calls[1]))
  })

  it("tras un éxito, la siguiente es otra operación y lleva otra clave", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { event: "stamp" }))
    await ejecutarSellado("cust-1", "stamp")
    await ejecutarSellado("cust-1", "stamp")
    expect(claveDe(fetchMock.mock.calls[0])).not.toBe(claveDe(fetchMock.mock.calls[1]))
  })

  it("un 400 zanja el asunto: no se aplicó, así que el siguiente intento va con clave nueva", async () => {
    fetchMock.mockResolvedValueOnce(respuesta(400, { error: "Invalid operation type" }))
    await expect(ejecutarSellado("cust-1", "stamp")).rejects.toThrow("Invalid operation type")

    fetchMock.mockResolvedValueOnce(respuesta(200, { event: "stamp" }))
    await ejecutarSellado("cust-1", "stamp")

    expect(claveDe(fetchMock.mock.calls[0])).not.toBe(claveDe(fetchMock.mock.calls[1]))
  })

  it("sellar y canjear al mismo cliente son operaciones distintas", async () => {
    fetchMock.mockResolvedValueOnce(respuesta(500))
    await expect(ejecutarSellado("cust-1", "stamp")).rejects.toBeInstanceOf(SelladoIncierto)
    fetchMock.mockResolvedValueOnce(respuesta(500))
    await expect(ejecutarSellado("cust-1", "redeem")).rejects.toBeInstanceOf(SelladoIncierto)

    expect(claveDe(fetchMock.mock.calls[0])).not.toBe(claveDe(fetchMock.mock.calls[1]))
  })
})
