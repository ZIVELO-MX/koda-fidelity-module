export const siteConfig = {
  name: "Koda Fidelity",
  shortName: "Koda",
  description:
    "Tarjetas digitales de lealtad con QR para pequeños negocios. Crea tu programa, comparte la tarjeta y registra sellos desde Koda.",
  url: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
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
    subtitle:
      "Tarjetas digitales de lealtad con QR y enlace seguro. Crea tu tarjeta, comparte el código y registra sellos desde tu dashboard.",
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
      title: "Crea tu Tarjeta",
      description:
        "Diseña una tarjeta de lealtad con tus colores y logo. Define tu recompensa y la cantidad de sellos.",
    },
    {
      icon: "Smartphone",
      title: "Clientes Reciben su Tarjeta",
      description:
        "Escanean el QR y reciben un enlace seguro por correo electrónico para acceder a su tarjeta digital.",
    },
    {
      icon: "Wallet",
      title: "Recompensa la Lealtad",
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

  footer: {
    tagline: "Parte del ecosistema Koda POS. Hecho para pequeños negocios.",
    links: [
      { label: "Contacto", href: "mailto:contacto@zivelo.dev" },
    ],
  },
}
