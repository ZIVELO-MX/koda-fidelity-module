import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/site-config"

/**
 * Un 404 en robots.txt no bloquea nada (Google lo lee como "permite todo"),
 * pero deja sin anunciar el sitemap y sin decir nada a los rastreadores de IA.
 *
 * Los rastreadores de IA se permiten a propósito: queremos que un asistente
 * pueda leer la landing y responder con ella. Lo que se cierra es lo privado
 * -- panel, API, enlaces de alta de clientes -- que no tiene por qué aparecer
 * en un índice ni en una respuesta.
 */
const PRIVADO = ["/api/", "/dashboard/", "/auth/", "/invite/", "/join/", "/my-cards", "/login"]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVADO }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  }
}
