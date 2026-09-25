import type { LucideIcon } from "lucide-react"
import { getCardIcon } from "@/lib/card-icons"
import { mezclar } from "@/lib/color-marca"

/**
 * Cómo se pinta cada tema de tarjeta.
 *
 * El catálogo lo sirve el backend con `{ id, code, plan }`; aquí vive lo que el
 * código significa a la vista. Son dos pieles distintas, y la forma de la
 * tarjeta no cambia en ninguna de las dos: ningún tema mueve el QR, la rejilla
 * de sellos ni el pie.
 *
 *   - **Lite**: el color de la marca más el patrón de íconos de su giro.
 *   - **Pro**: cuatro acabados y ninguno más, derivados también del color del
 *     negocio para que la tarjeta siga siendo suya.
 *
 * Todo se calcula desde `brandColor`. Sin tema efectivo, la tarjeta se pinta
 * con ese color a secas, que es lo que pide el diseño al bajar de Pro a Lite.
 */
export type AcabadoPro = "gradiente" | "foil" | "cinetico" | "vidrio"

/** Los cuatro acabados Pro. Ni uno más. */
export const ACABADOS_PRO: AcabadoPro[] = ["gradiente", "foil", "cinetico", "vidrio"]

export const NOMBRES_DE_TEMA: Record<string, string> = {
  panaderia: "Panadería",
  taqueria: "Taquería",
  cafeteria: "Cafetería",
  hamburguesas: "Hamburguesas",
  pizzeria: "Pizzería",
  barberia: "Barbería",
  "salon-belleza": "Salón de belleza",
  gimnasio: "Gimnasio",
  futbol: "Fútbol",
  sushi: "Sushi",
  veterinaria: "Veterinaria",
  farmacia: "Farmacia",
  heladeria: "Heladería",
  gradiente: "Gradiente vivo",
  foil: "Foil holográfico",
  cinetico: "Patrón cinético",
  vidrio: "Vidrio premium",
}

/** Los cuatro íconos con los que se genera el patrón de cada giro. */
const ICONOS_POR_GIRO: Record<string, string[]> = {
  panaderia: ["croissant", "wheat", "cookie", "cake"],
  taqueria: ["flame", "citrus", "leaf", "utensils"],
  cafeteria: ["coffee", "croissant", "cookie", "milk"],
  hamburguesas: ["sandwich", "flame", "cup-soda", "utensils-crossed"],
  pizzeria: ["pizza", "flame", "leaf", "citrus"],
  barberia: ["scissors", "paintbrush", "droplet", "sparkles"],
  "salon-belleza": ["sparkles", "scissors", "droplet", "heart"],
  gimnasio: ["dumbbell", "timer", "trophy", "flame"],
  futbol: ["trophy", "target", "medal", "flag"],
  sushi: ["fish", "leaf", "utensils-crossed", "droplet"],
  veterinaria: ["paw-print", "bone", "heart", "stethoscope"],
  farmacia: ["pill", "cross", "syringe", "thermometer"],
  heladeria: ["ice-cream-cone", "ice-cream-bowl", "cherry", "candy"],
}

export function esAcabadoPro(codigo: string | null | undefined): codigo is AcabadoPro {
  return Boolean(codigo) && ACABADOS_PRO.includes(codigo as AcabadoPro)
}

export function nombreDeTema(codigo: string) {
  return NOMBRES_DE_TEMA[codigo] ?? codigo
}

/** Los íconos del patrón de un giro, ya resueltos a componentes. */
export function iconosDelTema(codigo: string | null | undefined): LucideIcon[] | null {
  if (!codigo) return null
  const nombres = ICONOS_POR_GIRO[codigo]
  if (!nombres) return null
  const iconos = nombres.map((nombre) => getCardIcon(nombre)?.Icon).filter(Boolean) as LucideIcon[]
  return iconos.length ? iconos : null
}

export type PielDeTarjeta = {
  /** El `background` de la superficie. */
  fondo: string
  /** Capa encima del fondo y debajo del contenido, si el acabado la pide. */
  velo?: string
  /** Qué tan marcado va el patrón de íconos. */
  opacidadDelPatron: number
}

/**
 * La piel de la tarjeta.
 *
 * Sin código de tema -- que es lo que llega cuando `effectiveThemeId` es null,
 * el caso de un acabado Pro sobre un plan Lite -- se devuelve el degradado del
 * color del negocio. La tarjeta nunca se queda sin identidad.
 */
export function pielDeTarjeta(codigo: string | null | undefined, brandColor: string): PielDeTarjeta {
  // El punto más claro no sube de aquí en ningún acabado. La tarjeta lleva el
  // texto en blanco, y sobre un color de marca claro ese contraste ya va justo:
  // aclarar más por decoración lo empeoraría. Lo que distingue a un acabado de
  // otro es el tono y la textura, no el brillo.
  const claro = mezclar(brandColor, 255, 0.16)
  const oscuro = mezclar(brandColor, 0, 0.22)
  const base = `radial-gradient(120% 130% at 18% 4%, ${claro}, ${oscuro})`

  if (!esAcabadoPro(codigo)) {
    // Lite, y también el respaldo sin tema: el color del negocio y su patrón.
    return { fondo: base, opacidadDelPatron: 0.12 }
  }

  if (codigo === "gradiente") {
    // Gradiente vivo: la profundidad la da el lado oscuro, no un brillo nuevo.
    return {
      fondo:
        `radial-gradient(120% 120% at 12% 0%, ${claro} 0%, transparent 52%), ` +
        `linear-gradient(150deg, ${brandColor} 0%, ${mezclar(brandColor, 0, 0.5)} 100%)`,
      opacidadDelPatron: 0.1,
    }
  }

  if (codigo === "foil") {
    // Foil holográfico: la iridiscencia sale del tono -- bandas frías y cálidas
    // alternas -- y no de subir el blanco.
    return {
      fondo: base,
      velo:
        "repeating-linear-gradient(115deg, rgba(255,255,255,0.10) 0px, rgba(0,0,0,0.06) 14px, " +
        "rgba(90,200,255,0.16) 26px, rgba(255,140,220,0.16) 38px, rgba(0,0,0,0.06) 52px, " +
        "rgba(255,255,255,0.10) 64px)",
      opacidadDelPatron: 0.08,
    }
  }

  if (codigo === "cinetico") {
    // Patrón cinético: trazos en diagonal, alternando luz y sombra para que se
    // lea el relieve sin aclarar el conjunto. Estático a propósito: el
    // movimiento se reserva para lo que responde a una acción.
    return {
      fondo: base,
      velo:
        "repeating-linear-gradient(60deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 2px, " +
        "rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px, transparent 4px, transparent 12px)",
      opacidadDelPatron: 0.18,
    }
  }

  // Vidrio premium: un solo destello contenido y un borde inferior en sombra,
  // que es lo que da la sensación de pieza de cristal.
  return {
    fondo: base,
    velo:
      "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 34%, " +
      "rgba(0,0,0,0.10) 68%, rgba(0,0,0,0.18) 100%)",
    opacidadDelPatron: 0.07,
  }
}
