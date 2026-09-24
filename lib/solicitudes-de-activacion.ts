import { fallaDe, SIN_CONEXION, type Fallo } from "@/lib/fallos-de-api"

/**
 * Solicitud manual de activación, FID-0028.
 *
 * No hay proveedor de cobro. Crear una solicitud guarda un folio que soporte
 * usa para localizar la cuenta, y **no cobra, no activa el plan y no publica la
 * tarjeta**. El correo tampoco sale solo: lo manda la persona.
 *
 * El contrato es `GET/POST /api/subscription-requests`. El POST manda solo
 * `{ plan, billingInterval }`; el usuario y el negocio salen de la sesión, no
 * de un identificador enviado por el cliente.
 *
 * El contrato quedó fijo con el PR #135, así que la lectura se queda con una
 * sola forma: `{ request: null }` o `{ request: {...} }`. Lo que la misión
 * llama folio el servidor lo llama **`ticketNumber`**; se lee de ahí.
 *
 * `businessName` y `contactEmail` salen del servidor y no del estado del alta:
 * son los que soporte va a cotejar, y el correo debe llevar exactamente esos.
 */
export const RUTA = "/api/subscription-requests"

export type PlanSolicitado = "LITE" | "PRO"
export type IntervaloSolicitado = "MONTHLY" | "ANNUAL"

export type EstadoSolicitud = "PENDING" | "COMPLETED"

export type Solicitud = {
  folio: string
  plan: PlanSolicitado
  intervalo: IntervaloSolicitado
  estado: EstadoSolicitud
  /** Del servidor, no del alta: es lo que soporte va a cotejar. */
  negocio: string | null
  correo: string | null
}

export type Resultado =
  | { ok: true; solicitud: Solicitud | null }
  | { ok: false; fallo: Fallo }

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null
}

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" ? (valor as Record<string, unknown>) : {}
}

/** `{ request: null }` o `{ request: { ticketNumber, ... } }`. Nada más. */
export function leerSolicitud(cuerpo: unknown): Solicitud | null {
  const peticion = objeto(objeto(cuerpo).request)
  const folio = texto(peticion.ticketNumber)
  if (!folio) return null
  return {
    folio,
    plan: texto(peticion.plan) === "PRO" ? "PRO" : "LITE",
    intervalo: texto(peticion.billingInterval) === "MONTHLY" ? "MONTHLY" : "ANNUAL",
    estado: texto(peticion.status) === "COMPLETED" ? "COMPLETED" : "PENDING",
    negocio: texto(peticion.businessName),
    correo: texto(peticion.contactEmail),
  }
}

async function pedir(init?: RequestInit): Promise<Resultado> {
  let respuesta: Response
  try {
    respuesta = await fetch(RUTA, init)
  } catch {
    return { ok: false, fallo: SIN_CONEXION }
  }
  const requestId = respuesta.headers?.get?.("x-request-id") ?? undefined
  const cuerpo = await respuesta.json().catch(() => null)

  if (respuesta.status === 404) {
    // El endpoint todavía no existe en esta rama. Se dice tal cual en vez de
    // enseñar un folio inventado o un error que no explica nada.
    return {
      ok: false,
      fallo: {
        titulo: "La solicitud todavía no se puede crear",
        detalle: "Esta versión aún no tiene el servicio de solicitudes. Escribe a soporte@zivelo.dev y te la abrimos a mano.",
        requestId,
        reintentable: false,
      },
    }
  }
  if (respuesta.status === 409) {
    // Conflicto con significado: soporte ya activó este folio, así que cambiar
    // el plan no es cosa de esta pantalla. `fallaDe` lo leería como una
    // petición mal formada, que es otra cosa.
    return {
      ok: false,
      fallo: {
        titulo: "Tu solicitud ya fue atendida",
        detalle: texto(objeto(cuerpo).error) ?? "Soporte ya activó esta solicitud.",
        accion: `Escribe a ${SOPORTE} si necesitas cambiar el plan.`,
        requestId,
        reintentable: false,
      },
    }
  }
  if (!respuesta.ok) {
    return { ok: false, fallo: fallaDe(respuesta.status, objeto(cuerpo), requestId, "tu solicitud") }
  }

  const solicitud = leerSolicitud(cuerpo)
  if (init?.method === "POST" && !solicitud) {
    return {
      ok: false,
      fallo: {
        titulo: "La solicitud se creó pero no llegó su folio",
        detalle: "Sin folio soporte no puede localizarla. Vuelve a intentarlo, y si sigue igual escribe a soporte@zivelo.dev.",
        requestId,
        reintentable: true,
      },
    }
  }
  return { ok: true, solicitud }
}

/** La solicitud pendiente de este negocio, si la hay. */
export function solicitudVigente() {
  return pedir()
}

/**
 * Crea o actualiza la solicitud pendiente. El servidor conserva el folio si ya
 * había una y solo cambian el plan o la modalidad.
 */
export function solicitarActivacion(plan: PlanSolicitado, billingInterval: IntervaloSolicitado) {
  return pedir({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, billingInterval }),
  })
}

export const NOMBRE_DEL_PLAN: Record<PlanSolicitado, string> = { LITE: "Lite", PRO: "Pro" }
export const NOMBRE_DEL_INTERVALO: Record<IntervaloSolicitado, string> = {
  MONTHLY: "mensual",
  ANNUAL: "anual",
}

export const SOPORTE = "soporte@zivelo.dev"

export type DatosDelCorreo = {
  folio: string
  negocio: string | null
  correo: string | null
  plan: PlanSolicitado
  intervalo: IntervaloSolicitado
}

export function asuntoDelCorreo({ folio }: Pick<DatosDelCorreo, "folio">) {
  return `Activación Koda Fidelity — folio ${folio}`
}

/**
 * El cuerpo lleva lo que soporte necesita para encontrar la cuenta sin
 * preguntar. Lo que no se sabe se dice, no se rellena: un negocio sin nombre
 * escribe "(sin nombre)" y no una cadena vacía que parezca un dato.
 */
export function cuerpoDelCorreo({ folio, negocio, correo, plan, intervalo }: DatosDelCorreo) {
  return [
    "Hola, quiero activar mi plan de Koda Fidelity.",
    "",
    `Folio: ${folio}`,
    `Negocio: ${negocio ?? "(sin nombre)"}`,
    `Correo de la cuenta: ${correo ?? "(sin correo)"}`,
    `Plan: ${NOMBRE_DEL_PLAN[plan]}`,
    `Modalidad: ${NOMBRE_DEL_INTERVALO[intervalo]}`,
    "",
    "Quedo al pendiente de las condiciones antes de la activación.",
  ].join("\n")
}

export function enlaceDeCorreo(datos: DatosDelCorreo) {
  const asunto = encodeURIComponent(asuntoDelCorreo(datos))
  const cuerpo = encodeURIComponent(cuerpoDelCorreo(datos))
  return `mailto:${SOPORTE}?subject=${asunto}&body=${cuerpo}`
}
