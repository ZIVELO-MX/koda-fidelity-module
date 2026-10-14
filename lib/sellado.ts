/**
 * Sellar y canjear contra `/api/stamps`.
 *
 * El motor de lealtad exige `Idempotency-Key` y rechaza con 400 la petición que
 * no la trae. Pero mandar una clave nueva en cada intento no sirve de nada: si
 * la primera se perdió sin que supiéramos si el servidor la aplicó, el
 * reintento con clave distinta cuenta como otra operación y el cliente se lleva
 * dos sellos.
 *
 * Por eso la clave se guarda por operación -- mismo cliente, misma acción -- y
 * solo se tira cuando llega una respuesta que zanja el asunto:
 *
 *   - 2xx: se aplicó. Clave fuera; la siguiente vez es otra operación.
 *   - 4xx: no se aplicó, y reintentar igual va a fallar. Clave fuera.
 *   - 5xx o la red caída: NO SABEMOS. La clave se conserva, y el reintento
 *     llega con la misma, que es lo que deja al servidor reconocerla.
 */
export type TipoDeOperacion = "stamp" | "redeem"

export type ResultadoDeSellado = {
  event?: string
  milestoneClaim?: { id: string; label: string; iconName: string | null } | null
  [clave: string]: unknown
}

/** Error del que no se puede concluir si la operación se aplicó o no. */
export class SelladoIncierto extends Error {
  readonly incierto = true
  constructor(
    message = "No sabemos si se registró. Vuelve a intentar: si ya se había aplicado, no se duplica.",
    readonly requestId?: string,
  ) {
    super(message)
    this.name = "SelladoIncierto"
  }
}

const clavesEnVuelo = new Map<string, string>()

const identificador = (customerId: string, type: TipoDeOperacion) => `${customerId}:${type}`

function claveDe(id: string): string {
  const guardada = clavesEnVuelo.get(id)
  if (guardada) return guardada
  const nueva =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  clavesEnVuelo.set(id, nueva)
  return nueva
}

export async function ejecutarSellado(
  customerId: string,
  type: TipoDeOperacion,
): Promise<ResultadoDeSellado> {
  const id = identificador(customerId, type)
  const clave = claveDe(id)

  let res: Response
  try {
    res = await fetch("/api/stamps", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": clave },
      body: JSON.stringify({ customerId, type }),
    })
  } catch {
    // La petición ni siquiera volvió: puede haber llegado al servidor.
    throw new SelladoIncierto()
  }

  const requestId = res.headers?.get?.("x-request-id") ?? undefined

  if (!res.ok && (res.status ?? 0) >= 500) {
    throw new SelladoIncierto(undefined, requestId)
  }

  clavesEnVuelo.delete(id)

  const datos = (await res.json().catch(() => ({}))) as ResultadoDeSellado & { error?: string }

  if (!res.ok) {
    throw new Error(
      typeof datos.error === "string" && datos.error
        ? datos.error
        : "No fue posible procesar la operación",
    )
  }

  return datos
}

/** Solo para pruebas: olvida las claves guardadas entre casos. */
export function olvidarClavesDeSellado() {
  clavesEnVuelo.clear()
}
