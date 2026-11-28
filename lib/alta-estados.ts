import { isExpired } from "@/lib/card-utils"

export type MotivoNoDisponible = "vencida" | "no-disponible"
export type MotivoAlta = MotivoNoDisponible | "no-encontrada" | "sin-conexion"

export function motivoNoDisponible(card: {
  isActive: boolean
  status?: string | null
  expiresAt: Date | string | null
}): MotivoNoDisponible | null {
  if (isExpired(card.expiresAt)) return "vencida"
  return !card.isActive || (card.status && card.status !== "ACTIVE") ? "no-disponible" : null
}

const MIS_TARJETAS = { texto: "Ver mis tarjetas", href: "/my-cards" }
const CONSERVACION = "Si ya tenías sellos, siguen guardados en tus tarjetas."

const MENSAJES = {
  "no-encontrada": {
    titulo: "Este enlace no lleva a ninguna tarjeta",
    detalle: "Revisa el enlace o pídele al negocio que te lo comparta de nuevo.",
    accion: { texto: "Ir al inicio", href: "/" },
  },
  vencida: {
    titulo: "Esta tarjeta no está disponible por ahora",
    detalle: CONSERVACION,
    accion: MIS_TARJETAS,
  },
  "no-disponible": {
    titulo: "Esta tarjeta no está disponible",
    detalle: CONSERVACION,
    accion: MIS_TARJETAS,
  },
  "sin-conexion": {
    titulo: "No pudimos cargar la tarjeta",
    detalle: "Inténtalo de nuevo en unos momentos.",
    accion: { texto: "Reintentar", href: "" },
  },
} satisfies Record<MotivoAlta, { titulo: string; detalle: string; accion: { texto: string; href: string } }>

export function mensajeDeAlta(motivo: MotivoAlta) {
  return MENSAJES[motivo]
}
