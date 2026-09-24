import type { EstadoDelAlta } from "@/lib/onboarding"

/**
 * Qué se puede afirmar que quedó guardado, al volver a un alta empezada.
 *
 * La regla es no inventar datos completados: se nombra lo que el borrador trae
 * de verdad, campo por campo, y nada más. Decir "tenemos tus datos" cuando solo
 * hay el nombre del negocio le hace creer a la persona que no tiene que
 * revisar, y sí tiene.
 *
 * Vive fuera del componente porque es la parte que conviene probar sola: es
 * donde se decide qué se le promete a alguien que vuelve.
 */
export function loGuardado(estado: EstadoDelAlta): string[] {
  const partes: string[] = []
  if (estado.negocio.name?.trim()) partes.push("el nombre de tu negocio")
  if (estado.negocio.categoryId) partes.push("su categoría")
  if (estado.tarjeta.reward?.trim()) partes.push("la recompensa de tu tarjeta")
  if (typeof estado.tarjeta.stampsRequired === "number") partes.push("cuántos sellos pides")
  if (estado.tarjeta.brandColor?.trim()) partes.push("tu color")
  if (estado.tarjeta.themeId?.trim()) partes.push("el tema que elegiste")
  if (estado.acquisitionSource) partes.push("cómo llegaste")
  return partes
}

/**
 * Solo se anuncia la reanudación si hay algo que reanudar. Un alta recién
 * empezada no necesita que le digan que se recuperó nada.
 */
export function hayQueReanudar(estado: EstadoDelAlta): boolean {
  return estado.step !== "INTRO" && loGuardado(estado).length > 0
}

/** "a, b y c" — la coma seria no se usa en español. */
export function enumerar(partes: string[]): string {
  if (partes.length === 0) return ""
  if (partes.length === 1) return partes[0]
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`
}
