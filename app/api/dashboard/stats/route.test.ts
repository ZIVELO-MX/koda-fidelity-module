import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { getBusinessFromSession, queryRaw } = vi.hoisted(() => ({ getBusinessFromSession: vi.fn(), queryRaw: vi.fn() }))
vi.mock("@/lib/api-utils", async () => ({ ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")), getBusinessFromSession }))
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: queryRaw } }))

import { GET } from "./route"

const pedir = (days: number) => GET({ url: `http://x/api/dashboard/stats?days=${days}`, headers: new Headers() } as never)

describe("GET /api/dashboard/stats en la zona del negocio", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // 14:00 en Ciudad de México del 30 de septiembre.
    vi.setSystemTime(new Date("2026-09-30T20:00:00Z"))
    getBusinessFromSession.mockResolvedValue({ business: { id: "biz1", timezone: "America/Mexico_City" } })
    queryRaw.mockResolvedValue([])
  })
  afterEach(() => vi.useRealTimers())

  it("termina la serie en el día local de hoy y empieza a medianoche local", async () => {
    const cuerpo = await (await pedir(2)).json()
    expect(cuerpo.daily.map((d: { date: string }) => d.date)).toEqual(["2026-09-29", "2026-09-30"])
    expect(cuerpo.period.from).toBe("2026-09-29T06:00:00.000Z")
  })

  // `createdAt` es TIMESTAMP sin zona: hay que declararlo UTC antes de convertir.
  it("convierte la hora guardada desde UTC antes de agrupar por día y semana", async () => {
    await pedir(7)
    const sql = queryRaw.mock.calls.map(([partes]: [TemplateStringsArray]) => partes.join("?"))
    expect(sql.filter((texto) => texto.includes(`AT TIME ZONE 'UTC') AT TIME ZONE`))).toHaveLength(2)
  })
})
