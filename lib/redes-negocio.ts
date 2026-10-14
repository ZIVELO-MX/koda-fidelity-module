/**
 * Los enlaces públicos de un negocio, listos para pintar junto a la tarjeta del
 * cliente.
 *
 * El contrato FID-C1 v1 dice que `BusinessPublic` lleva `website` e `instagram`
 * opcionales. Hoy la consulta pública todavía no los manda, así que esto
 * devuelve una lista vacía y el portal no pinta nada. Cuando el backend amplíe
 * el `select`, la interfaz se enciende sola: por eso el consumidor no espera al
 * merge de la otra rama.
 *
 * Los dos valores los escribe el negocio en Configuración y se muestran a sus
 * clientes, así que solo salen de aquí como `http` o `https`. Un `javascript:`
 * escrito en ese campo no se convierte en un enlace.
 */

export type RedNegocio = {
  clave: "website" | "instagram"
  etiqueta: string
  url: string
}

type NegocioConRedes = {
  website?: string | null
  instagram?: string | null
}

function urlSegura(valor: string): string | null {
  try {
    const url = new URL(valor)
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

function normalizarSitio(valor: string): string | null {
  const limpio = valor.trim()
  if (!limpio) return null
  // Sin esquema es lo que la gente escribe: "minegocio.com".
  return urlSegura(/^[a-z][a-z0-9+.-]*:/i.test(limpio) ? limpio : `https://${limpio}`)
}

function normalizarInstagram(valor: string): string | null {
  const limpio = valor.trim().replace(/\/+$/, "")
  if (!limpio) return null

  // Se acepta el perfil completo, el dominio suelto o solo el usuario.
  const conDominio = limpio.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(.+)$/i)
  const usuario = (conDominio ? conDominio[1] : limpio).replace(/^@/, "").split(/[/?#]/)[0]

  if (!/^[A-Za-z0-9._]{1,30}$/.test(usuario)) return null
  return `https://instagram.com/${usuario}`
}

export function redesDelNegocio(negocio: NegocioConRedes | null | undefined): RedNegocio[] {
  if (!negocio) return []
  const redes: RedNegocio[] = []

  const sitio = typeof negocio.website === "string" ? normalizarSitio(negocio.website) : null
  if (sitio) redes.push({ clave: "website", etiqueta: "Sitio web", url: sitio })

  const instagram =
    typeof negocio.instagram === "string" ? normalizarInstagram(negocio.instagram) : null
  if (instagram) redes.push({ clave: "instagram", etiqueta: "Instagram", url: instagram })

  return redes
}
