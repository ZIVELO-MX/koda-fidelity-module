/**
 * La ayuda de la aplicación, en un solo sitio.
 *
 * Vivía como una página de trescientas líneas con maquetas dibujadas de la
 * propia aplicación: para verlas había que estar dentro de la aplicación. Ahora
 * cada tema cuelga de la pantalla donde hace falta, y el encabezado abre el de
 * la pantalla en la que estás.
 */

export type Pregunta = {
  pregunta: string
  respuesta: string
}

export type Tema = {
  /** Prefijo de ruta al que pertenece el tema. */
  ruta: string
  titulo: string
  preguntas: Pregunta[]
}

export const TEMAS: Tema[] = [
  {
    ruta: "/dashboard",
    titulo: "Panel",
    preguntas: [
      {
        pregunta: "¿Qué es Koda Fidelity?",
        respuesta:
          "Una plataforma de tarjetas de lealtad digitales. Creas una tarjeta, tus clientes se unen con un código QR o un enlace, y tú sellas cada visita hasta que llegan al premio.",
      },
      {
        pregunta: "¿Dónde veo cómo va el programa?",
        respuesta:
          "El Panel resume el total de clientes, las tarjetas activas, las visitas recientes y los sellos canjeados.",
      },
    ],
  },
  {
    ruta: "/dashboard/cards",
    titulo: "Tarjetas",
    preguntas: [
      {
        pregunta: "¿Cómo creo una tarjeta?",
        respuesta:
          "En Tarjetas, dentro del grupo Programa, usa el botón Nueva tarjeta. Eliges el premio, cuántos sellos hacen falta para llegar a él, el nombre y el diseño. Al guardarla ya tienes su enlace y su código QR.",
      },
      {
        pregunta: "¿Qué tipo de programa puedo crear?",
        respuesta:
          "Programas por sellos: el cliente acumula visitas o compras y al llegar al número que fijaste recibe el premio.",
      },
      {
        pregunta: "¿Puedo tener varias tarjetas?",
        respuesta:
          "Sí, tantas como necesites, cada una con su diseño y su configuración. Sirve para varias sucursales o para programas distintos.",
      },
    ],
  },
  {
    ruta: "/dashboard/customers",
    titulo: "Clientes",
    preguntas: [
      {
        pregunta: "¿Cómo gestiono a mis clientes?",
        respuesta:
          "En Clientes ves quién se registró, a qué tarjeta pertenece, cuántos sellos lleva y cuándo vino por última vez. Puedes buscarlos por nombre o por correo.",
      },
      {
        pregunta: "¿Mis clientes necesitan una cuenta?",
        respuesta:
          "No. Se unen escaneando el código QR o abriendo el enlace, y solo dan su nombre y su correo.",
      },
    ],
  },
  {
    ruta: "/dashboard/qr-codes",
    titulo: "Códigos QR",
    preguntas: [
      {
        pregunta: "¿Cómo funcionan los códigos QR?",
        respuesta:
          "Cada tarjeta tiene el suyo. Lo descargas, lo imprimes y lo pones en tu local: quien lo escanea se une a esa tarjeta.",
      },
      {
        pregunta: "¿Puedo compartir la tarjeta sin imprimir nada?",
        respuesta:
          "Sí. Cada tarjeta tiene también un enlace. Cópialo desde Códigos QR y mándalo por mensaje o por correo.",
      },
    ],
  },
  {
    ruta: "/dashboard/scan",
    titulo: "Escáner",
    preguntas: [
      {
        pregunta: "¿Cómo sello una visita?",
        respuesta:
          "Abre el Escáner con el botón central de la barra inferior y apunta al código del cliente. El sello se registra al leerlo.",
      },
      {
        pregunta: "¿Y si la cámara no abre?",
        respuesta:
          "El navegador pide permiso la primera vez. Si lo negaste, hay que volver a darlo desde los ajustes del navegador para ese sitio.",
      },
    ],
  },
  {
    ruta: "/dashboard/branding",
    titulo: "Marca",
    preguntas: [
      {
        pregunta: "¿Qué decide Marca?",
        respuesta:
          "El nombre del negocio, el logo y el color con el que se pintan la aplicación y la tarjeta que ve tu cliente. La vista previa de la derecha muestra el resultado antes de guardar.",
      },
      {
        pregunta: "¿Dónde cambio el nombre del negocio?",
        respuesta:
          "Aquí, en Marca. Configuración lo muestra pero no lo edita, para que no haya dos sitios donde cambiarlo y uno pise al otro.",
      },
    ],
  },
  {
    ruta: "/dashboard/team",
    titulo: "Equipo",
    preguntas: [
      {
        pregunta: "¿Qué puede hacer cada rol?",
        respuesta:
          "El sellador atiende el día a día: ve tarjetas y clientes, sella y canjea. El admin además edita tarjetas, marca, configuración y el propio equipo. La comparación completa está en el botón Ver permisos por rol.",
      },
      {
        pregunta: "¿Cómo invito a alguien?",
        respuesta:
          "Con el botón Invitar colaborador. Se crea su cuenta con una contraseña temporal que tendrá que cambiar al entrar, y la compartes desde el mismo panel.",
      },
    ],
  },
  {
    ruta: "/dashboard/settings",
    titulo: "Configuración",
    preguntas: [
      {
        pregunta: "¿Qué se guarda en Configuración?",
        respuesta:
          "Los datos del negocio que no se ven en la tarjeta: el tipo de negocio, tu apodo en el panel, la dirección y el teléfono.",
      },
      {
        pregunta: "¿Mi sitio web y mi Instagram se muestran a los clientes?",
        respuesta:
          "Todavía no. Se guardan, pero ninguna pantalla de cliente los muestra por ahora.",
      },
      {
        pregunta: "¿Dónde está el modo claro y oscuro?",
        respuesta:
          "En tu menú de perfil, al pie de la barra lateral.",
      },
    ],
  },
]

/**
 * El tema de la pantalla actual. Gana el prefijo más largo que case, para que
 * `/dashboard/cards/nueva` caiga en Tarjetas y no en Panel.
 */
export function temaDe(pathname: string): Tema | undefined {
  return TEMAS.filter(
    (tema) => pathname === tema.ruta || pathname.startsWith(`${tema.ruta}/`),
  ).sort((a, b) => b.ruta.length - a.ruta.length)[0]
}
