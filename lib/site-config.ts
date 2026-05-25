export const siteConfig = {
  name: "Koda Fidelity",
  shortName: "Koda",
  description:
    "Tarjetas de fidelidad digitales para Apple Wallet y Google Wallet. Convierte clientes recurrentes en clientes leales con Koda.",
  url: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  ogImage: "/og-default.png",
  keywords: [
    "tarjetas de fidelidad digitales",
    "apple wallet",
    "google wallet",
    "lealtad digital",
    "programa de fidelidad",
    "koda pos",
    "negocios locales",
    "tarjetas de lealtad",
    "sellos digitales",
    "fidelización clientes",
  ],
  creator: "@zivelo",
  locale: "es_MX",

  defaultBrandColor: "#f97316",

  hero: {
    tagline: "Lealtad Digital Hecha Simple",
    title: "Convierte clientes recurrentes en ",
    titleHighlight: "clientes leales",
    subtitle:
      "Tarjetas de fidelidad digitales para Apple Wallet y Google Wallet. Sin apps que descargar. Sin cuentas que crear. Solo escanea, guarda y recompensa.",
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
      title: "Clientes Escanean y Guardan",
      description:
        "Imprime tu código QR. Los clientes lo escanean y guardan la tarjeta al instante en Apple o Google Wallet.",
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
      icon: "Wallet",
      title: "Integración con Wallet",
      description:
        "Soporte nativo para Apple Wallet y Google Wallet. Las tarjetas se actualizan en tiempo real.",
    },
    {
      icon: "QrCode",
      title: "Flujo con QR",
      description:
        "Sin apps necesarias. Los clientes escanean un código QR y listo.",
    },
    {
      icon: "Zap",
      title: "Configuración Instantánea",
      description:
        "Crea tu primera tarjeta de lealtad en menos de 2 minutos.",
    },
    {
      icon: "Shield",
      title: "Seguro y Privado",
      description:
        "Los datos del cliente están protegidos. Sin cuenta requerida para clientes.",
    },
    {
      icon: "BarChart3",
      title: "Analíticas Simples",
      description:
        "Monitorea sellos, canjes y la actividad de tus clientes.",
    },
    {
      icon: "Smartphone",
      title: "Mobile-First",
      description:
        "Optimizado para la forma en que los clientes interactúan con los negocios.",
    },
  ],

  useCases: [
    { emoji: "☕", name: "Cafeterías", example: "Compra 9, llévate 1 gratis" },
    { emoji: "🍕", name: "Restaurantes", example: "Postre gratis después de 5 visitas" },
    { emoji: "💇", name: "Barberías", example: "10mo corte gratis" },
    { emoji: "🛒", name: "Tiendas Locales", example: "Acumula puntos en tus compras" },
  ],

  pricing: [
    {
      name: "Gratis",
      price: "$0",
      description: "Perfecto para probar y empezar con la lealtad digital.",
      features: [
        "1 tarjeta de lealtad activa",
        "Hasta 50 clientes",
        "Marca personalizada (color + logo)",
        "Código QR para compartir",
        "Apple Wallet y Google Wallet",
      ],
      cta: "Comenzar Gratis",
      href: "/signup",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "$249",
      period: "/mes",
      description: "Para negocios que quieren crecer con sus clientes.",
      features: [
        "Tarjetas de lealtad ilimitadas",
        "Clientes ilimitados",
        "Marca personalizada (color + logo)",
        "Códigos QR individuales por tarjeta",
        "Apple Wallet y Google Wallet",
        "Analíticas avanzadas",
        "Soporte prioritario",
      ],
      cta: "Probar Gratis",
      href: "/signup",
      highlighted: true,
    },
    {
      name: "Premium",
      price: "$499",
      period: "/mes",
      description: "Para cadenas y negocios con múltiples sucursales.",
      features: [
        "Todo en Pro",
        "Múltiples sucursales",
        "Dashboard centralizado",
        "API personalizada",
        "Onboarding dedicado",
        "SLA garantizado",
      ],
      cta: "Contactar",
      href: "/signup",
      highlighted: false,
    },
  ],

  cta: {
    title: "¿Listo para construir lealtad?",
    description:
      "Comienza tu prueba gratis hoy. Sin tarjeta de crédito. Crea tu primera tarjeta de lealtad en minutos.",
    cta: "Comenzar Gratis",
    href: "/signup",
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
