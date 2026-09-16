/**
 * El alta guiada: intro, datos, tarjeta, el club, origen y muro de pago.
 *
 * Hoy, al registrarse, se cae directo a un panel vacío y sin explicación. Este
 * módulo tiene la forma del flujo y su persistencia; las pantallas viven en
 * components/onboarding.
 *
 * Lo que se guarda vive en este navegador, no en el servidor: el campo que
 * marca el alta como terminada todavía no existe en el modelo, y fingir que
 * guardamos en la nube sería prometer algo que no hacemos. En cuanto exista
 * ese campo, `cargarBorrador` y `guardarBorrador` son los dos únicos sitios
 * que cambian.
 */
export type PasoId = "intro" | "datos" | "tarjeta" | "club" | "origen" | "pago"

export type Paso = {
  id: PasoId
  etiqueta: string
  /** Obligatorio se pinta sólido; lo que se puede saltar o abandonar, en contorno. */
  obligatorio: boolean
  /** El club es un momento de llegada, no un paso: no entra en la barra. */
  enLaBarra: boolean
}

export const PASOS: Paso[] = [
  { id: "intro", etiqueta: "Intro", obligatorio: false, enLaBarra: true },
  { id: "datos", etiqueta: "Datos", obligatorio: true, enLaBarra: true },
  { id: "tarjeta", etiqueta: "Tarjeta", obligatorio: true, enLaBarra: true },
  { id: "club", etiqueta: "Tu club", obligatorio: false, enLaBarra: false },
  { id: "origen", etiqueta: "Origen", obligatorio: false, enLaBarra: true },
  { id: "pago", etiqueta: "Plan", obligatorio: true, enLaBarra: true },
]

export const PASOS_EN_LA_BARRA = PASOS.filter((p) => p.enLaBarra)

export const ORDEN: PasoId[] = PASOS.map((p) => p.id)

export function pasoSiguiente(actual: PasoId): PasoId | null {
  const i = ORDEN.indexOf(actual)
  return i >= 0 && i < ORDEN.length - 1 ? ORDEN[i + 1] : null
}

export function pasoAnterior(actual: PasoId): PasoId | null {
  const i = ORDEN.indexOf(actual)
  return i > 0 ? ORDEN[i - 1] : null
}

/**
 * Las trece categorías del sistema de temas, más una salida.
 *
 * No es una lista de relleno: la categoría elige el juego de íconos con el que
 * se genera el patrón de la tarjeta. Una categoría fuera de estas trece deja la
 * tarjeta sin patrón, así que aquí solo caben las que el sistema sabe pintar.
 *
 * El carrusel de la landing enseña siete, que son un subconjunto para vender.
 */
export const CATEGORIAS = [
  "Panadería",
  "Taquería",
  "Cafetería",
  "Hamburguesas",
  "Pizzería",
  "Barbería",
  "Salón de belleza",
  "Gimnasio",
  "Fútbol",
  "Sushi",
  "Veterinaria",
  "Farmacia",
  "Heladería",
  "Otro",
] as const

/** Las opciones de sellos del diseño. Ni un campo libre ni un número al azar. */
export const SELLOS_POSIBLES = [5, 8, 10, 12] as const

export type Borrador = {
  paso: PasoId
  negocio: string
  categoria: string
  sellos: number
  recompensa: string
  color: string
  origen: string | null
  /** Se salta a propósito, que no es lo mismo que no haberlo contestado aún. */
  origenSaltado: boolean
}

export const BORRADOR_VACIO: Borrador = {
  paso: "intro",
  negocio: "",
  categoria: "",
  sellos: 10,
  recompensa: "",
  color: "#ff6b35",
  origen: null,
  origenSaltado: false,
}

const CLAVE = "koda-fidelity:alta"

export function cargarBorrador(): Borrador | null {
  if (typeof window === "undefined") return null
  try {
    const crudo = window.localStorage.getItem(CLAVE)
    if (!crudo) return null
    const datos = JSON.parse(crudo) as Partial<Borrador>
    // Se acepta lo que se reconoce y nada más: un borrador de otra versión no
    // puede colarse como si estuviera completo.
    if (!datos || typeof datos !== "object") return null
    return {
      ...BORRADOR_VACIO,
      ...datos,
      paso: ORDEN.includes(datos.paso as PasoId) ? (datos.paso as PasoId) : "intro",
      sellos: SELLOS_POSIBLES.includes(datos.sellos as never) ? (datos.sellos as number) : 10,
    }
  } catch {
    return null
  }
}

export function guardarBorrador(borrador: Borrador): boolean {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(borrador))
    return true
  } catch {
    // Navegación privada o almacenamiento lleno: no se guarda, y la pantalla
    // lo dice en vez de enseñar un "guardado" que no ocurrió.
    return false
  }
}

export function olvidarBorrador() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(CLAVE)
  } catch {
    // Nada que hacer: si no se pudo borrar, tampoco se pudo guardar.
  }
}

/** Qué falta para poder salir de un paso obligatorio. */
export function loQueFalta(paso: PasoId, b: Borrador): string | null {
  if (paso === "datos") {
    if (!b.negocio.trim()) return "Escribe el nombre de tu negocio."
    if (!b.categoria.trim()) return "Elige la categoría de tu negocio."
    return null
  }
  if (paso === "tarjeta") {
    if (!b.recompensa.trim()) return "Escribe qué se lleva tu cliente al llenar la tarjeta."
    return null
  }
  return null
}
