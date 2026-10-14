/**
 * Traduce un fallo de la API a algo que una pantalla pueda decir.
 *
 * El contrato FID-C1 manda `ApiErrorBody` con `code`, `action`, `requestId` y
 * `retryable`. Esto se apoya en el código y no en el número de estado: un 400
 * por cursor inválido y un 400 por periodo fuera de rango no se le explican
 * igual a quien está mirando.
 *
 * El `requestId` se enseña. Es lo único que convierte un "no cargó" en un
 * reporte que alguien puede rastrear.
 */
export type Fallo = {
  titulo: string
  detalle: string
  accion?: string
  requestId?: string
  reintentable: boolean
}

export type CuerpoDeError = Record<string, unknown> | null

export function fallaDe(estado: number, cuerpo: CuerpoDeError, requestId?: string, sujeto = "esta información"): Fallo {
  const codigo = typeof cuerpo?.code === "string" ? cuerpo.code : ""
  const detalle = typeof cuerpo?.error === "string" ? cuerpo.error : ""
  const accion = typeof cuerpo?.action === "string" ? cuerpo.action : undefined
  const id = (typeof cuerpo?.requestId === "string" ? cuerpo.requestId : undefined) ?? requestId
  const reintentable = cuerpo?.retryable === true

  if (codigo === "KF-AUTH-001" || estado === 401) {
    return { titulo: "Tu sesión terminó", detalle: `Vuelve a entrar para ver ${sujeto}.`, accion, requestId: id, reintentable: false }
  }
  if (codigo === "KF-ACCESS-001" || estado === 403) {
    return { titulo: "No tienes acceso", detalle: `Tu cuenta no puede ver ${sujeto} del negocio.`, accion, requestId: id, reintentable: false }
  }
  if (codigo === "KF-ACCOUNT-READONLY" || estado === 423) {
    return { titulo: "La cuenta está en sólo lectura", detalle: detalle || "El cierre programado dejó la cuenta sin escritura.", accion, requestId: id, reintentable: false }
  }
  if (codigo === "KF-REQUEST-001" || estado === 400) {
    return { titulo: "La petición no era válida", detalle: detalle || "Vuelve a intentarlo desde el principio.", accion, requestId: id, reintentable: false }
  }
  return {
    titulo: `No pudimos cargar ${sujeto}`,
    detalle: detalle || "El servidor no respondió como esperábamos.",
    accion,
    requestId: id,
    reintentable: reintentable || estado >= 500 || estado === 0,
  }
}

/** El fallo de una petición que ni siquiera llegó: sin respuesta no hay `requestId`. */
export const SIN_CONEXION: Fallo = {
  titulo: "No hay conexión",
  detalle: "No pudimos hablar con el servidor.",
  reintentable: true,
}
