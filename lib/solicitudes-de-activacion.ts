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
 * La lectura es tolerante a propósito mientras el backend aterriza: el folio se
 * acepta suelto o envuelto en `request` o `subscriptionRequest`. No se inventan
 * nombres de campo alternativos -- si el servidor llama al folio de otra forma,
 * esto devuelve null y la pantalla lo dice, que es mejor que adivinar. Cuando
 * el contrato esté fijo, esta función se queda con una sola forma.
 */
export const RUTA = "/api/subscription-requests"

export type PlanSolicitado = "LITE" | "PRO"
export type IntervaloSolicitado = "MONTHLY" | "ANNUAL"

export type Solicitud = {
  folio: string
  plan: PlanSolicitado
  intervalo: IntervaloSolicitado
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

/** Saca la solicitud de donde venga, sin inventar campos que no existan. */
export function leerSolicitud(cuerpo: unknown): Solicitud | null {
  const raiz = objeto(cuerpo)
  for (const candidato of [raiz, objeto(raiz.request), objeto(raiz.subscriptionRequest)]) {
    const folio = texto(candidato.folio)
    if (!folio) continue
    const plan = texto(candidato.plan) === "PRO" ? "PRO" : "LITE"
    const intervalo = texto(candidato.billingInterval) === "MONTHLY" ? "MONTHLY" : "ANNUAL"
    return { folio, plan, intervalo }
  }
  return null
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
