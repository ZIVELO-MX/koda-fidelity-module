/**
 * Por qué un enlace de alta no lleva a una tarjeta.
 *
 * Los tres casos existían, pero los tres se pintaban bajo el mismo título,
 * "Tarjeta no encontrada". A quien escanea un código impreso de una tarjeta
 * vencida se le decía que el enlace no existe, que es falso y no le dice qué
 * hacer.
 *
 * El cuarto motivo, la tarjeta desactivada por cambio de plan, es el único que
 * de verdad le ocurre a alguien con el código ya impreso y repartido: la
 * tarjeta estuvo activa, el negocio bajó de plan y sus QR siguen en la calle.
 * Quien escanea no tiene nada que ver con eso, así que el mensaje no lo culpa
 * ni le pide una acción que no puede hacer.
 */
export type MotivoAlta = "no-encontrada" | "vencida" | "cerrada" | "desactivada"

export type MensajeAlta = {
  titulo: string
  /** Ámbar para lo que pide una decisión; el resto va neutro. Nunca rojo: no
   *  está roto y no es culpa de quien lo lee. */
  tono?: "aviso"
  detalle: string
  accion: { texto: string; href: string }
}

const MENSAJES: Record<MotivoAlta, MensajeAlta> = {
  "no-encontrada": {
    titulo: "Este enlace no lleva a ninguna tarjeta",
    detalle:
      "Puede que el código esté mal copiado o que el negocio haya borrado la tarjeta. Pídele al negocio un enlace nuevo.",
    accion: { texto: "Ir al inicio", href: "/" },
  },
  vencida: {
    titulo: "Esta tarjeta ya venció",
    detalle:
      "El negocio le puso fecha de fin y ya pasó, así que no acepta nuevos miembros. Si ya tenías sellos en ella, siguen en tus tarjetas.",
    accion: { texto: "Ver mis tarjetas", href: "/my-cards" },
  },
  desactivada: {
    titulo: "Esta tarjeta está temporalmente desactivada",
    detalle:
      "El negocio pausó su programa, así que por ahora no acepta nuevos miembros. Si ya tenías sellos en ella, siguen guardados y los recuperas cuando vuelva a estar activa.",
    tono: "aviso",
    accion: { texto: "Ver mis tarjetas", href: "/my-cards" },
  },
  cerrada: {
    titulo: "Esta tarjeta ya no acepta nuevos miembros",
    detalle:
      "El negocio la cerró a nuevas altas. Quienes ya estaban dentro pueden seguir usándola desde sus tarjetas.",
    accion: { texto: "Ver mis tarjetas", href: "/my-cards" },
  },
}

export function mensajeDeAlta(motivo: MotivoAlta): MensajeAlta {
  return MENSAJES[motivo]
}
