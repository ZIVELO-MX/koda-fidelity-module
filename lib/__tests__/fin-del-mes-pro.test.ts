import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/supabase-admin", () => ({ createAdminClient: vi.fn() }))

import { applyEntitlements } from "@/lib/account-lifecycle"
import { avisoDeFinDeMes, tarjetaQueSeConserva, type TarjetaParaElAviso } from "@/lib/fin-del-mes-pro"

const AHORA = new Date("2026-10-01T12:00:00Z")
const DIA = 24 * 60 * 60 * 1000
const enDias = (d: number) => new Date(AHORA.getTime() + d * DIA)

const tarjeta = (id: string, dias: number, extra: Partial<TarjetaParaElAviso> = {}): TarjetaParaElAviso => ({
  id, name: `Tarjeta ${id}`, reward: "Un café", stampsRequired: 10, brandColor: "#f97316",
  status: "ACTIVE", isActive: true, isLite: false, createdAt: new Date(AHORA.getTime() - dias * DIA),
  selectedTheme: null, ...extra,
})
const prueba = (terminaEnDias: number | null, trial = true) => ({
  trial,
  billingInterval: "ANNUAL" as const,
  subscription: { id: "sub-1", proTrialEndsAt: terminaEnDias === null ? null : enDias(terminaEnDias) },
})

describe("cuándo aparece el aviso", () => {
  it("con tres días de margen, no antes", () => {
    expect(avisoDeFinDeMes(prueba(3), [], AHORA)).not.toBeNull()
    expect(avisoDeFinDeMes(prueba(3.2), [], AHORA)).toBeNull()
  })
  it("no aparece si el mes ya terminó, si no hay prueba o si no hay fecha", () => {
    expect(avisoDeFinDeMes(prueba(-0.1), [], AHORA)).toBeNull()
    expect(avisoDeFinDeMes(prueba(2, false), [], AHORA)).toBeNull()
    expect(avisoDeFinDeMes(prueba(null), [], AHORA)).toBeNull()
  })
  it("cuenta los días que faltan hacia arriba: con horas por delante aún queda un día", () => {
    expect(avisoDeFinDeMes(prueba(0.3), [], AHORA)!.diasRestantes).toBe(1)
    expect(avisoDeFinDeMes(prueba(2.5), [], AHORA)!.diasRestantes).toBe(3)
  })
})

describe("qué cambia", () => {
  it("con una sola tarjeta no anuncia desactivaciones", () => {
    const aviso = avisoDeFinDeMes(prueba(2), [tarjeta("a", 10)], AHORA)!
    expect(aviso.seDesactivan).toEqual([])
    expect(aviso.seQueda).toBeNull()
  })
  it("con varias, dice cuál sigue y cuáles se desactivan", () => {
    const aviso = avisoDeFinDeMes(prueba(2), [tarjeta("nueva", 1), tarjeta("vieja", 20), tarjeta("media", 5)], AHORA)!
    expect(aviso.seQueda).toBe("Tarjeta vieja")
    expect(aviso.seDesactivan.sort()).toEqual(["Tarjeta media", "Tarjeta nueva"])
  })
  it("las ya bloqueadas o archivadas no se cuentan como cambio", () => {
    const aviso = avisoDeFinDeMes(prueba(2), [
      tarjeta("a", 20), tarjeta("b", 10, { isActive: false, status: "LOCKED_BY_PLAN" }), tarjeta("c", 5, { status: "ARCHIVED", isActive: false }),
    ], AHORA)!
    expect(aviso.seDesactivan).toEqual([])
  })
  it("enseña la primera tarjeta con acabado Pro", () => {
    const aviso = avisoDeFinDeMes(prueba(2), [tarjeta("a", 20), tarjeta("b", 10, { selectedTheme: { code: "foil", plan: "PRO" } })], AHORA)!
    expect(aviso.tarjetaConAcabado?.themeCode).toBe("foil")
    expect(aviso.tarjetaConAcabado?.name).toBe("Tarjeta b")
  })
  it("mantener Pro se pide con la modalidad que ya tiene", () => {
    expect(avisoDeFinDeMes(prueba(2), [], AHORA)!.intervalo).toBe("ANNUAL")
  })
})

/**
 * Paridad con `applyEntitlements`, que es quien de verdad baja a Lite. Se
 * ejecuta la función real sobre una base falsa en memoria: si alguien cambia la
 * regla allí, esta prueba lo dice antes de que el aviso mienta.
 */
describe("paridad con applyEntitlements", () => {
  async function bajarALite(tarjetas: TarjetaParaElAviso[]) {
    const bloqueadas: string[] = []
    const db = {
      loyaltyCard: {
        findMany: async () => [...tarjetas].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map((t) => ({ ...t, selectedThemeId: t.selectedTheme ? `theme-${t.selectedTheme.code}` : null })),
        update: async ({ where, data }: { where: { id: string }; data: { status: string } }) => {
          if (data.status === "LOCKED_BY_PLAN") bloqueadas.push(where.id)
        },
      },
      loyaltyTheme: { findUnique: async () => ({ plan: "PRO" }) },
    }
    const [conservada] = await applyEntitlements(db as never, "b1", "LITE")
    return { conservada: conservada?.id, bloqueadas }
  }

  const casos: [string, TarjetaParaElAviso[]][] = [
    ["la más antigua sin marca Lite", [tarjeta("x", 1), tarjeta("y", 30), tarjeta("z", 9)]],
    ["la marcada como Lite gana a la más antigua", [tarjeta("x", 30), tarjeta("y", 2, { isLite: true }), tarjeta("z", 9)]],
    ["una archivada no cuenta aunque sea la más antigua", [tarjeta("x", 40, { status: "ARCHIVED", isActive: false }), tarjeta("y", 3), tarjeta("z", 9)]],
  ]
  for (const [nombre, tarjetas] of casos) {
    it(nombre, async () => {
      const real = await bajarALite(tarjetas)
      expect(tarjetaQueSeConserva(tarjetas)?.id).toBe(real.conservada)
      const aviso = avisoDeFinDeMes(prueba(2), tarjetas, AHORA)!
      const nombresBloqueados = tarjetas.filter((t) => real.bloqueadas.includes(t.id) && t.isActive).map((t) => t.name).sort()
      expect([...aviso.seDesactivan].sort()).toEqual(nombresBloqueados)
    })
  }
})
