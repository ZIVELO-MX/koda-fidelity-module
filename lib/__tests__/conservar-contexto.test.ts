import { describe, it, expect } from "vitest"
import { conservarContexto } from "../onboarding"
import type { EstadoDelAlta } from "../onboarding"

const CON_CONTEXTO: EstadoDelAlta = {
  step: "CARD", status: "IN_PROGRESS", draftVersion: 3,
  negocio: { name: "Café Aurora" }, tarjeta: { reward: "Décimo gratis" },
  acquisitionSource: null, selectedBillingInterval: null, primeraTarjetaId: null,
  categorias: [{ id: "cat-1", name: "Cafetería" }],
  temas: [
    { id: "t-lite", code: "cafeteria", plan: "LITE" },
    { id: "t-pro", code: "foil", plan: "PRO" },
  ],
  modo: "live", plan: "PRO",
  nombreDeLaCuenta: "Café Aurora", correoDeLaCuenta: "raul@cafeaurora.mx",
}

/** Lo que devolvía un PATCH o un POST antes de #139: solo el progreso. */
const SIN_CONTEXTO: EstadoDelAlta = {
  ...CON_CONTEXTO, draftVersion: 4, tarjeta: { reward: "Café gratis" },
  categorias: [], temas: [], plan: "LITE",
  nombreDeLaCuenta: null, correoDeLaCuenta: null,
}

describe("conservarContexto", () => {
  it("una respuesta sin catálogo no vacía el que ya teníamos", () => {
    const r = conservarContexto(CON_CONTEXTO, SIN_CONTEXTO)
    expect(r.temas).toHaveLength(2)
    expect(r.categorias).toHaveLength(1)
  })

  it("tampoco degrada el plan, que es lo que repintaba un acabado Pro como Lite", () => {
    expect(conservarContexto(CON_CONTEXTO, SIN_CONTEXTO).plan).toBe("PRO")
  })

  it("ni pierde la identidad de la cuenta, que va en el correo a soporte", () => {
    const r = conservarContexto(CON_CONTEXTO, SIN_CONTEXTO)
    expect(r.nombreDeLaCuenta).toBe("Café Aurora")
    expect(r.correoDeLaCuenta).toBe("raul@cafeaurora.mx")
  })

  it("lo que sí manda el servidor siempre gana: paso, estado, borradores y versión", () => {
    const r = conservarContexto(CON_CONTEXTO, { ...SIN_CONTEXTO, step: "ACQUISITION" })
    expect(r.step).toBe("ACQUISITION")
    expect(r.draftVersion).toBe(4)
    expect(r.tarjeta.reward).toBe("Café gratis")
  })

  it("con contexto en la respuesta, el del servidor gana aunque baje el plan", () => {
    // Un downgrade real a Lite tiene que llegar: aquí el servidor sí habló.
    const bajado: EstadoDelAlta = { ...CON_CONTEXTO, plan: "LITE" }
    expect(conservarContexto(CON_CONTEXTO, bajado).plan).toBe("LITE")
  })

  it("y un catálogo que de verdad cambió sustituye al anterior", () => {
    const otro: EstadoDelAlta = { ...CON_CONTEXTO, temas: [{ id: "t-x", code: "panaderia", plan: "LITE" }] }
    expect(conservarContexto(CON_CONTEXTO, otro).temas).toEqual([{ id: "t-x", code: "panaderia", plan: "LITE" }])
  })

  it("sin estado previo no hay nada que conservar", () => {
    expect(conservarContexto(null, SIN_CONTEXTO)).toBe(SIN_CONTEXTO)
  })
})
