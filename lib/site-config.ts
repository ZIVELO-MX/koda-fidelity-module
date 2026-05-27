export const siteConfig = {
  name: "Koda Fidelity",
  shortName: "Koda",
  description:
    "Tarjetas digitales de lealtad con QR para pequeños negocios. Crea tu programa, comparte la tarjeta y registra sellos desde Koda.",
  url: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  ogImage: "/og-default.png",
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
      step: "01",
      title: "Crea tu Tarjeta",
      description:
        "Diseña una tarjeta de lealtad con tus colores y logo. Define tu recompensa y la cantidad de sellos.",
    },
    {
      icon: "Smartphone",
      step: "02",
      title: "Clientes Reciben su Tarjeta",
      description:
        "Escanean el QR y reciben un enlace seguro por correo electrónico para acceder a su tarjeta digital.",
    },
    {
      icon: "Wallet",
      step: "03",
      title: "Recompensa la Lealtad",
      description:
        "Escanea las tarjetas de clientes para agregar sellos. Cuando alcanzan la meta, canjean su recompensa.",
    },
  ],

  features: [
    {
      icon: "Smartphone",
      title: "Portal con Enlace Seguro",
      description:
        "Los clientes acceden a su tarjeta digital mediante un enlace mágico enviado por correo electrónico, sin necesidad de contraseña.",
    },
    {
      icon: "QrCode",
      title: "Flujo con QR",
      description:
        "Sin apps necesarias. Los clientes escanean un código QR y reciben su tarjeta al instante.",
    },
    {
      icon: "Zap",
      title: "Configuración Instantánea",
      description:
        "Crea tu primera tarjeta de lealtad en menos de 2 minutos.",
    },
    {
      icon: "Shield",
      title: "Acceso Seguro",
      description:
        "Los datos del cliente están protegidos. El acceso es por correo electrónico mediante un enlace de un solo uso.",
    },
    {
      icon: "BarChart3",
      title: "Analíticas Simples",
      description:
        "Monitorea sellos, canjes y la actividad de tus clientes.",
    },
    {
      icon: "CheckCircle2",
      title: "Sellado desde el panel",
      description:
        "Escanea el QR del cliente y agrega o canjea sellos directamente desde el panel.",
    },
  ],

  useCases: [
    { emoji: "☕", name: "Cafeterías", example: "Compra 9, llévate 1 gratis" },
    { emoji: "🍕", name: "Restaurantes", example: "Postre gratis después de 5 visitas" },
    { emoji: "💇", name: "Barberías", example: "10mo corte gratis" },
    { emoji: "🛒", name: "Tiendas Locales", example: "Acumula puntos en tus compras" },
  ],

  pricing: {
    title: "Precios por definir",
    description: "Nuestra oferta comercial se publicará próximamente. Mientras tanto, puedes iniciar sesión si ya tienes acceso.",
  },

  cta: {
    title: "¿Listo para construir lealtad?",
    description:
      "Inicia sesión y crea tu primera tarjeta de lealtad digital en minutos.",
    cta: "Iniciar Sesión",
    href: "/login",
  },

  footer: {
    tagline: "Parte del ecosistema Koda POS. Hecho para pequeños negocios.",
    links: [
      { label: "Privacidad", href: "/privacy" },
      { label: "Términos", href: "/terms" },
      { label: "Soporte", href: "mailto:soporte@koda.app" },
    ],
  },
}
