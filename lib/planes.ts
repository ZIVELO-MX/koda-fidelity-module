/**
 * Los importes vienen de la decisión de precios confirmados del ciclo: Lite 149
 * y Pro 299 al mes, y el anual son doce meses pagando diez.
 *
 * Viven aquí y no dentro del componente de precios porque tres sitios los
 * necesitan: la sección de precios, el JSON-LD de la landing y llms.txt. Una
 * sola fuente para que un precio no pueda quedar distinto según dónde se mire.
 */
export type Plan = {
  id: string
  nombre: string
  resumen: string
  insignia?: string
  mensual: number
  anual: number
  incluye: string[]
}

export const PLANES: Plan[] = [
  {
    id: "lite",
    nombre: "Lite",
    resumen: "Para empezar con una tarjeta",
    mensual: 149,
    anual: 1490,
    incluye: [
      "Una tarjeta de lealtad activa",
      "Altas por QR y por enlace",
      "Sellado y canje desde el escáner",
      "El primer mes con todo lo de Pro",
    ],
  },
  {
    id: "pro",
    nombre: "Pro",
    resumen: "Para varias tarjetas o sucursales",
    // "Todo incluido" es un hecho: lleva lo de Lite y lo demás. "Más popular"
    // sería inventarse un dato que no tenemos.
    insignia: "Todo incluido",
    mensual: 299,
    anual: 2990,
    incluye: [
      "Varias tarjetas activas a la vez",
      "Todos los diseños de tarjeta",
      "Altas por QR y por enlace",
      "Sellado y canje desde el escáner",
    ],
  },
]

/** Mes y año desde los que rigen estos importes. Señal de vigencia, no adorno. */
export const PRECIOS_VIGENTES_DESDE = "septiembre de 2026"
