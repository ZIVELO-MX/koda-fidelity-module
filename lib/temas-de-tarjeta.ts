import type { LucideIcon } from "lucide-react"
import { getCardIcon } from "@/lib/card-icons"
import { contraste, mezclar } from "@/lib/color-marca"

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
  /** El color del texto, elegido por contraste sobre este acabado. */
  texto: string
  /** Hacia dónde tiran las placas y el pie según el contraste automático.
   *  Este valor no cambia al forzar texto claro u oscuro. */
  aparta: number
  /** Se conserva por compatibilidad; elegir texto nunca ajusta el fondo. */
  tonoAjustado: boolean
  /** Si el texto elegido alcanza contraste AA sobre los extremos de la piel. */
  colorDeTextoRespetado: boolean
}

/**
 * El color del texto es independiente del fondo. Con `AUTO` se escoge la tinta
 * que tenga mejor contraste; `DARK` y `LIGHT` respetan exactamente la elección
 * del negocio y solo informan si queda por debajo de AA.
 */
export type ColorDeTexto = "AUTO" | "DARK" | "LIGHT"

const TINTA = "#1C1B17"
const BLANCO = "#FFFFFF"

/** Elige la tinta usando los extremos previstos de la piel, sin tocar la marca. */
function legible(brandColor: string, aclara: number, oscurece: number, forzado: ColorDeTexto = "AUTO") {
  const extremos = [mezclar(brandColor, 255, aclara), mezclar(brandColor, 0, oscurece)]
  const contrasteTinta = Math.min(...extremos.map((fondo) => contraste(TINTA, fondo)))
  const contrasteBlanco = Math.min(...extremos.map((fondo) => contraste(BLANCO, fondo)))
  const textoAutomatico = contrasteTinta >= contrasteBlanco ? TINTA : BLANCO
  const texto = forzado === "DARK" ? TINTA : forzado === "LIGHT" ? BLANCO : textoAutomatico
  const contrasteTexto = texto === TINTA ? contrasteTinta : contrasteBlanco
  return {
    base: brandColor,
    texto,
    aparta: textoAutomatico === TINTA ? 255 : 0,
    tonoAjustado: false,
    colorDeTextoRespetado: contrasteTexto >= 4.5,
  }
}

/**
 * La piel de la tarjeta.
 *
 * Sin código de tema -- que es lo que llega cuando `effectiveThemeId` es null,
 * el caso de un acabado Pro sobre un plan Lite -- se devuelve el degradado del
 * color del negocio. La tarjeta nunca se queda sin identidad.
 */
export function pielDeTarjeta(
  codigo: string | null | undefined,
  brandColor: string,
  colorDeTexto: ColorDeTexto = "AUTO",
): PielDeTarjeta {
  // Cada acabado declara sus variaciones para calcular contraste. Esas
  // variaciones son decorativas y nunca cambian el color base de la tarjeta.
  const OSCURO = 0.12

  if (!esAcabadoPro(codigo)) {
    // Lite, y también el respaldo sin tema: el color del negocio y su patrón.
    const { base, texto, aparta, tonoAjustado, colorDeTextoRespetado } = legible(brandColor, 0, OSCURO, colorDeTexto)
    return { fondo: degradado(base, OSCURO), opacidadDelPatron: 0.12, texto, aparta, tonoAjustado, colorDeTextoRespetado }
  }

  if (codigo === "gradiente") {
    // Gradiente vivo: la profundidad la da el lado oscuro, no un brillo nuevo.
    const HONDO = 0.5
    const { base, texto, aparta, tonoAjustado, colorDeTextoRespetado } = legible(brandColor, 0, HONDO, colorDeTexto)
    return {
      fondo: `linear-gradient(150deg, ${base} 0%, ${mezclar(base, 0, HONDO)} 100%)`,
      opacidadDelPatron: 0.1,
      texto,
      aparta,
      tonoAjustado,
      colorDeTextoRespetado,
    }
  }

  if (codigo === "foil") {
    // Foil holográfico: la iridiscencia sale del tono -- bandas frías y cálidas
    // alternas -- y no de subir el blanco.
    const { base, texto, aparta, tonoAjustado, colorDeTextoRespetado } = legible(brandColor, 0.1, OSCURO + 0.06, colorDeTexto)
    return {
      fondo: degradado(base, OSCURO),
      velo:
        "repeating-linear-gradient(115deg, rgba(255,255,255,0.10) 0px, rgba(0,0,0,0.06) 14px, " +
        "rgba(90,200,255,0.16) 26px, rgba(255,140,220,0.16) 38px, rgba(0,0,0,0.06) 52px, " +
        "rgba(255,255,255,0.10) 64px)",
      opacidadDelPatron: 0.08,
      texto,
      aparta,
      tonoAjustado,
      colorDeTextoRespetado,
    }
  }

  if (codigo === "cinetico") {
    // Patrón cinético: trazos en diagonal, alternando luz y sombra para que se
    // lea el relieve sin aclarar el conjunto. Estático a propósito: el
    // movimiento se reserva para lo que responde a una acción.
    const { base, texto, aparta, tonoAjustado, colorDeTextoRespetado } = legible(brandColor, 0.1, OSCURO + 0.08, colorDeTexto)
    return {
      fondo: degradado(base, OSCURO),
      velo:
        "repeating-linear-gradient(60deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 2px, " +
        "rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px, transparent 4px, transparent 12px)",
      opacidadDelPatron: 0.18,
      texto,
      aparta,
      tonoAjustado,
      colorDeTextoRespetado,
    }
  }

  // Vidrio premium: un solo destello contenido y un borde inferior en sombra,
  // que es lo que da la sensación de pieza de cristal.
  const { base, texto, aparta, tonoAjustado, colorDeTextoRespetado } = legible(brandColor, 0.14, OSCURO + 0.18, colorDeTexto)
  return {
    fondo: degradado(base, OSCURO),
    velo:
      "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 34%, " +
      "rgba(0,0,0,0.10) 68%, rgba(0,0,0,0.18) 100%)",
    opacidadDelPatron: 0.07,
    texto,
    aparta,
    tonoAjustado,
    colorDeTextoRespetado,
  }
}

/** El degradado de la superficie: del color tal cual a su versión honda. */
function degradado(base: string, oscuro: number): string {
  return `radial-gradient(120% 130% at 18% 4%, ${base}, ${mezclar(base, 0, oscuro)})`
}
