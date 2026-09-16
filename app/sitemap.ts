import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/site-config"

/**
 * Solo las rutas públicas que queremos en un índice. El panel, las altas por
 * enlace y la API quedan fuera aquí y en robots.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date()
  return [
    { url: `${siteConfig.url}/`, lastModified: ahora, changeFrequency: "monthly", priority: 1 },
    { url: `${siteConfig.url}/signup`, lastModified: ahora, changeFrequency: "yearly", priority: 0.8 },
    { url: `${siteConfig.url}/privacidad`, lastModified: ahora, changeFrequency: "yearly", priority: 0.3 },
  ]
}
