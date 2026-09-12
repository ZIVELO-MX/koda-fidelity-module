/**
 * Por qué un enlace de alta no lleva a una tarjeta.
 *
 * Los tres casos existían, pero los tres se pintaban bajo el mismo título,
 * "Tarjeta no encontrada". A quien escanea un código impreso de una tarjeta
 * vencida se le decía que el enlace no existe, que es falso y no le dice qué
 * hacer.
 *
 * ponytail: falta un cuarto motivo, la tarjeta desactivada por cambio de plan.
 * Espera a que la consulta pública lo exponga; hoy no llega al cliente.
 */
export type MotivoAlta = "no-encontrada" | "vencida" | "cerrada"

export type MensajeAlta = {
  titulo: string
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
