import { describe, it, expect, vi } from "vitest"
import { crearColaDeBorrador, fusionarCambios } from "../cola-de-borrador"

/** El mismo perfil de cambios que manda el alta. */
type Cambios = {
  business?: Record<string, unknown>
  card?: Record<string, unknown>
  acquisitionSource?: string | null
}

type Estado = { draftVersion: number }

/** Un servidor de mentira que se puede dejar en vuelo a voluntad. */
function servidor(inicial = 1) {
  let version = inicial
  const recibidos: { version: number; cambios: Cambios }[] = []
  const enVuelo: { resolver: (e: Estado) => void; rechazar: (e: unknown) => void }[] = []
  const guardar = (v: number, cambios: Cambios) => {
    recibidos.push({ version: v, cambios })
    return new Promise<Estado>((resolver, rechazar) => enVuelo.push({ resolver, rechazar }))
  }
  return {
    guardar, recibidos, enVuelo,
    /** Resuelve el vuelo más viejo como lo haría el servidor: sube la versión. */
    responder: () => enVuelo.shift()!.resolver({ draftVersion: ++version }),
    fallar: (error: unknown) => enVuelo.shift()!.rechazar(error),
  }
}

function cola(s: ReturnType<typeof servidor>, inicial = 1) {
  const guardados: Estado[] = []
  const fallos: unknown[] = []
  const c = crearColaDeBorrador<Estado, Cambios>({
    versionInicial: inicial,
    guardar: s.guardar,
    versionDe: (e) => e.draftVersion,
    alGuardar: (e) => guardados.push(e),
    alFallar: (e) => fallos.push(e),
  })
  return { c, guardados, fallos }
}

describe("fusionarCambios", () => {
  it("mezcla business y card campo por campo, sin borrar lo anterior", () => {
    const f = fusionarCambios<Cambios>({ business: { name: "Café" } }, { business: { categoryId: "c1" } })
    expect(f.business).toEqual({ name: "Café", categoryId: "c1" })
  })

  it("el valor nuevo de un mismo campo gana", () => {
    const f = fusionarCambios<Cambios>({ card: { reward: "viejo" } }, { card: { reward: "nuevo" } })
    expect(f.card).toEqual({ reward: "nuevo" })
  })

  it("un null explícito viaja, porque borrar es una intención", () => {
    const f = fusionarCambios<Cambios>({ acquisitionSource: "SOCIAL" }, { acquisitionSource: null })
    expect(f.acquisitionSource).toBeNull()
  })
})

describe("la cola del borrador", () => {
  it("no pierde una edición hecha mientras otra petición está en vuelo", async () => {
    const s = servidor()
    const { c, guardados } = cola(s)

    c.encolar({ business: { name: "Café" } })
    expect(s.recibidos).toHaveLength(1)

    // Se escribe durante el vuelo. Antes esto se perdía.
    c.encolar({ business: { categoryId: "c1" } })
    expect(s.recibidos, "no debe salir una segunda petición en paralelo").toHaveLength(1)

    s.responder()
    await vi.waitFor(() => expect(s.recibidos).toHaveLength(2))
    s.responder()
    await vi.waitFor(() => expect(guardados).toHaveLength(2))

    expect(s.recibidos[1].cambios.business).toEqual({ categoryId: "c1" })
  })

  it("la segunda petición usa la versión que devolvió el servidor, no una del cierre", async () => {
    const s = servidor(1)
    const { c } = cola(s, 1)

    c.encolar({ card: { reward: "uno" } })
    expect(s.recibidos[0].version).toBe(1)

    c.encolar({ card: { reward: "dos" } })
    s.responder() // el servidor pasa a la versión 2
    await vi.waitFor(() => expect(s.recibidos).toHaveLength(2))

    // Aquí estaba el conflicto: antes volvía a mandar 1.
    expect(s.recibidos[1].version).toBe(2)
  })

  it("si un guardado falla, sus cambios vuelven a la cola en vez de perderse", async () => {
    const s = servidor()
    const { c, fallos } = cola(s)

    c.encolar({ business: { name: "Café" } })
    s.fallar(new Error("500"))
    await vi.waitFor(() => expect(fallos).toHaveLength(1))

    // No se reintenta solo, pero lo pendiente sigue ahí.
    expect(c.ocupada()).toBe(true)
    void c.vaciar()
    await vi.waitFor(() => expect(s.recibidos).toHaveLength(2))
    expect(s.recibidos[1].cambios.business).toEqual({ name: "Café" })
  })

  it("lo que llegó después de un fallo no se pierde ni pisa a lo que falló", async () => {
    const s = servidor()
    const { c, fallos } = cola(s)

    c.encolar({ business: { name: "Café" } })
    c.encolar({ card: { reward: "uno" } })
    s.fallar(new Error("500"))
    await vi.waitFor(() => expect(fallos).toHaveLength(1))

    void c.vaciar()
    await vi.waitFor(() => expect(s.recibidos).toHaveLength(2))
    // Las dos tandas viajan juntas: el nombre y la recompensa.
    expect(s.recibidos[1].cambios.business).toEqual({ name: "Café" })
    expect(s.recibidos[1].cambios.card).toEqual({ reward: "uno" })
  })

  it("vaciar espera al vuelo, que es lo que necesita avanzar de paso", async () => {
    const s = servidor()
    const { c, guardados } = cola(s)

    c.encolar({ business: { name: "Café" } })
    let vaciada = false
    void c.vaciar().then(() => { vaciada = true })

    expect(vaciada, "no puede darse por vaciada con un vuelo abierto").toBe(false)
    s.responder()
    await vi.waitFor(() => expect(vaciada).toBe(true))
    expect(guardados).toHaveLength(1)
    expect(c.ocupada()).toBe(false)
  })

  it("sin nada encolado, vaciar no manda peticiones", async () => {
    const s = servidor()
    const { c } = cola(s)
    await c.vaciar()
    expect(s.recibidos).toHaveLength(0)
  })
})

describe("la versión tras avanzar de paso", () => {
  it("sembrar evita que el siguiente guardado salga con una versión vieja", async () => {
    const s = servidor(1)
    const { c } = cola(s, 1)

    // Avanzar de paso subió la versión en el servidor, de 1 a 5.
    c.sembrar(5)
    c.encolar({ card: { reward: "uno" } })

    expect(s.recibidos[0].version).toBe(5)
  })
})
