/**
 * El origen del sitio. Antes caía a localhost en silencio: si la variable
 * faltaba en un entorno de despliegue, el canonical, el og:image y el sitemap
 * se publicaban apuntando a una máquina local sin que nadie se enterara.
 *
 * Ahora hay tres pasos: la variable explícita, el dominio que Vercel asigna
 * solo (que cubre los previews), y si en producción no hay ninguno, truena el
 * build en vez de mentir.
 */
function resolverUrlBase(): string {
  const explicita = process.env.NEXT_PUBLIC_BASE_URL
  if (explicita) return explicita.replace(/\/$/, "")

  const deVercel = process.env.NEXT_PUBLIC_VERCEL_URL
  if (deVercel) return `https://${deVercel}`

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_BASE_URL no está definida. Sin ella el canonical, las imágenes de Open Graph y el sitemap saldrían apuntando a localhost.",
    )
  }

  return "http://localhost:3000"
}

export const siteConfig = {
  name: "Koda Fidelity",
  shortName: "Koda",
  description:
    "Koda Fidelity es el programa de lealtad digital para negocios locales en México: tarjetas con QR, sin app para tus clientes y sellos desde tu celular.",
  // El título de la pestaña y del resultado de búsqueda. Suelto y no derivado
  // de `name` porque la banda que Google alcanza a mostrar son 50-60 caracteres.
  metaTitle: "Koda Fidelity | Tarjetas de lealtad digitales en México",
  url: resolverUrlBase(),
  ogImage: "/opengraph-image",
  keywords: [
    "tarjetas de lealtad digitales",
    "tarjetas de fidelidad",
    "lealtad digital",
    "programa de fidelidad",
    "koda pos",
    "negocios locales",
    "tarjetas de lealtad",
    "sellos digitales",
    "fidelización clientes",
    "qr lealtad",
  ],
  creator: "@zivelo",
  locale: "es_MX",

  defaultBrandColor: "#f97316",

  hero: {
    tagline: "Lealtad Digital Hecha Simple",
    title: "Convierte clientes recurrentes en ",
    titleHighlight: "clientes leales",
    // Arranca definiendo qué es el producto, en una frase que se sostiene sola
    // fuera de la página: es la que cita un asistente cuando le preguntan por
    // Koda Fidelity, y la que lee quien llega sin saber a qué entró.
    subtitle:
      "Koda Fidelity es el programa de lealtad digital para negocios locales: tus clientes abren su tarjeta escaneando un QR, sin instalar nada, y tú sellas desde el escáner de tu panel.",
    demoCard: {
      businessName: "The Daily Grind",
      currentStamps: 6,
      maxStamps: 10,
      reward: "Free Coffee",
      brandColor: "#f97316",
    },
  },

  howItWorks: [
    {
      icon: "QrCode",
      title: "Crea tu tarjeta",
      description:
        "Diseña una tarjeta de lealtad con tus colores y logo. Define tu recompensa y la cantidad de sellos.",
    },
    {
      icon: "Smartphone",
      title: "Tu cliente la recibe",
      description:
        "Escanean el QR y reciben un enlace seguro por correo electrónico para acceder a su tarjeta digital.",
    },
    {
      icon: "Wallet",
      title: "Sella y recompensa",
      description:
        "Escanea las tarjetas de clientes para agregar sellos. Cuando alcanzan la meta, canjean su recompensa.",
    },
  ],

  // `features` y `useCases` se retiraron con el rediseño de la landing: sus
  // dos rejillas decían lo mismo que las cuatro claves y que el carrusel de
  // giros, una detrás de otra. Ver app/page.tsx.

  pricing: {
    title: "Precios claros para negocios locales",
    description: "Dos planes, sin permanencia. Pagas por año y recibes dos meses.",
  },

  cta: {
    title: "¿Listo para construir lealtad?",
    description:
      "Crea tu primera tarjeta de lealtad digital en minutos.",
    cta: "Empieza por solo $149 al mes",
    href: "/signup",
  },

  /**
   * Identidad del responsable para el aviso de privacidad. La LFPDPPP pide
   * razón social, RFC y domicilio fiscal: en cuanto ZIVELO los aporte, se
   * llenan aquí y el aviso los publica solo. Los campos vacíos no se pintan,
   * así que el aviso nunca muestra un hueco ni un dato inventado.
   */
  legal: {
    responsable: "ZIVELO",
    razonSocial: "",
    rfc: "",
    domicilio: "",
    correo: "contacto@zivelo.dev",
    actualizado: "13 de septiembre de 2026",
  },

  footer: {
    // El ecosistema se nombra en su propia píldora del pie, así que aquí sobraba.
    tagline: "Tarjetas de lealtad digitales para negocios de barrio.",
    links: [
      { label: "Contacto", href: "mailto:contacto@zivelo.dev" },
    ],
  },
}
