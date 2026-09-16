import { siteConfig } from "@/lib/site-config"
import { PLANES } from "@/lib/planes"
import { PREGUNTAS } from "@/components/landing/preguntas"

/**
 * llms.txt: el resumen que un asistente lee para responder sobre el producto
 * sin tener que interpretar la landing entera. Se genera desde las mismas
 * constantes que pinta la página, así que no puede quedarse atrás de los
 * precios ni de las preguntas reales.
 *
 * Va como ruta y no como archivo en public/ para que los enlaces salgan con el
 * dominio de cada entorno en vez de uno escrito a mano.
 */
const PESOS = new Intl.NumberFormat("es-MX")

export const dynamic = "force-static"

export function GET() {
  const planes = PLANES.map(
    (p) =>
      `- **${p.nombre}** (${p.resumen}): $${PESOS.format(p.mensual)} MXN al mes o $${PESOS.format(p.anual)} MXN al año. Incluye: ${p.incluye.join("; ")}.`,
  ).join("\n")

  const faq = PREGUNTAS.map((p) => `### ${p.pregunta}\n${p.respuesta}`).join("\n\n")

  const cuerpo = `# ${siteConfig.name}

> ${siteConfig.name} es un servicio de tarjetas de lealtad digitales con código QR para negocios pequeños en México. El negocio diseña su tarjeta, la comparte por QR o por enlace, y sella y canjea desde el escáner del panel. El cliente final no instala ninguna aplicación: abre su tarjeta en el navegador.

Operado por ZIVELO (${siteConfig.url}). Parte del ecosistema Koda POS.

## Precios

Sin permanencia. Crear la cuenta y diseñar la tarjeta no cuesta: el plan se contrata al publicarla. El pago anual equivale a doce meses pagando diez.

${planes}

## Preguntas frecuentes

${faq}

## Enlaces

- [Landing](${siteConfig.url}/): qué es, cómo funciona, diseños por giro.
- [Precios](${siteConfig.url}/#pricing)
- [Preguntas frecuentes](${siteConfig.url}/#faq)
- [Crear una cuenta](${siteConfig.url}/signup)
- [Solicitar una demo](${siteConfig.url}/#demo)
- [Aviso de privacidad](${siteConfig.url}/privacidad)
- [Contacto](mailto:contacto@zivelo.dev)
`

  return new Response(cuerpo, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
