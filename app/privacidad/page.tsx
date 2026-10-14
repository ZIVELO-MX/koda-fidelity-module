import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: `Qué datos recoge ${siteConfig.name}, para qué los usa y cómo pedir que se corrijan o se borren.`,
  alternates: { canonical: `${siteConfig.url}/privacidad` },
}

/**
 * El formulario de demo decía "al enviar aceptas nuestra política de
 * privacidad" y esa política no existía en ninguna parte. Esta página la
 * respalda.
 *
 * Lo que dice aquí es lo que el código hace de verdad: los campos son los del
 * esquema de Prisma, no una plantilla genérica. Si cambia lo que se guarda,
 * cambia también este texto.
 */
const SECCIONES: { titulo: string; parrafos: string[]; lista?: string[] }[] = [
  {
    titulo: "Quién es responsable de tus datos",
    parrafos: [
      `${siteConfig.legal.responsable} es responsable del tratamiento de los datos personales que se recogen en ${siteConfig.name}, el servicio de tarjetas de lealtad digitales que forma parte del ecosistema Koda POS.`,
    ],
  },
  {
    titulo: "Qué datos recogemos del negocio",
    parrafos: [
      "Cuando creas una cuenta para tu negocio guardamos lo necesario para que tu programa de lealtad funcione y para poder contactarte:",
    ],
    lista: [
      "Nombre del negocio y correo electrónico de la cuenta.",
      "Nombre de las personas de tu equipo que invitas al panel, y su correo.",
      "Los datos que decidas llenar en la configuración: giro, dirección, teléfono, sitio web e Instagram.",
      "El diseño de tus tarjetas: color, logo, ícono, premio y número de sellos.",
    ],
  },
  {
    titulo: "Qué datos recogemos de los clientes de tu negocio",
    parrafos: [
      "Cuando una persona se da de alta en tu tarjeta, se guarda lo mínimo para que pueda volver a entrar a ella y para que sus sellos no se pierdan:",
    ],
    lista: [
      "Su nombre.",
      "Su correo electrónico, que es lo que le permite abrir su tarjeta desde cualquier teléfono.",
      "Sus sellos, sus premios canjeados y las fechas de esos movimientos.",
    ],
  },
  {
    titulo: "Para qué los usamos",
    parrafos: [
      "Para operar el servicio: mostrar la tarjeta, contar los sellos, validar un canje, mandar el enlace de acceso por correo y darte soporte cuando lo pides.",
      "No vendemos datos personales ni los compartimos con terceros para publicidad. Los datos de los clientes de tu negocio son tuyos y del cliente: nosotros los guardamos para que el servicio funcione.",
    ],
  },
  {
    titulo: "Con quién se comparten",
    parrafos: [
      "Solo con los proveedores que hacen falta para que el servicio opere, y únicamente para eso: el alojamiento de la aplicación, la base de datos y el envío de correos de acceso. Cada uno trata los datos por instrucción nuestra.",
    ],
  },
  {
    titulo: "Cuánto tiempo se conservan",
    parrafos: [
      "Mientras la cuenta del negocio esté activa. Si cierras tu cuenta, se eliminan las tarjetas y los registros de sellos asociados, salvo lo que debamos conservar por una obligación legal o fiscal.",
    ],
  },
  {
    titulo: "Tus derechos",
    parrafos: [
      `Puedes pedir acceder a tus datos, corregirlos, cancelarlos u oponerte a su uso, y revocar tu consentimiento en cualquier momento. Escribe a ${siteConfig.legal.correo} y te respondemos por la misma vía.`,
      "Si eres cliente de un negocio que usa Koda Fidelity y quieres que se borren tus datos, puedes escribirnos también a esa dirección y lo tramitamos con el negocio.",
    ],
  },
  {
    titulo: "Cambios a este aviso",
    parrafos: [
      "Si cambia lo que recogemos o para qué lo usamos, actualizamos esta página y la fecha de abajo. No hay cambios que se apliquen hacia atrás sin avisar.",
    ],
  },
]

export default function PrivacidadPage() {
  const { razonSocial, rfc, domicilio } = siteConfig.legal
  const identidad = [
    razonSocial && { etiqueta: "Razón social", valor: razonSocial },
    rfc && { etiqueta: "RFC", valor: rfc },
    domicilio && { etiqueta: "Domicilio", valor: domicilio },
    { etiqueta: "Correo de contacto", valor: siteConfig.legal.correo },
  ].filter(Boolean) as { etiqueta: string; valor: string }[]

  return (
    <div className="landing min-h-screen bg-background forced-light">
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al inicio
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Aviso de privacidad
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Qué datos recoge {siteConfig.name}, para qué se usan y cómo pedir que se corrijan o se
          borren. Está escrito en los mismos términos que el servicio funciona, sin letra chica.
        </p>

        <dl className="mt-10 divide-y divide-border border-y border-border">
          {identidad.map((dato) => (
            <div key={dato.etiqueta} className="flex flex-wrap gap-x-6 gap-y-1 py-4">
              <dt className="w-40 shrink-0 text-sm text-muted-foreground">{dato.etiqueta}</dt>
              <dd className="min-w-0 text-sm font-medium text-foreground">{dato.valor}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 space-y-10">
          {SECCIONES.map((seccion) => (
            <section key={seccion.titulo}>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {seccion.titulo}
              </h2>
              {seccion.parrafos.map((parrafo) => (
                <p key={parrafo} className="mt-3 leading-relaxed text-muted-foreground">
                  {parrafo}
                </p>
              ))}
              {seccion.lista && (
                <ul className="mt-4 space-y-2">
                  {seccion.lista.map((punto) => (
                    <li
                      key={punto}
                      className="flex gap-3 leading-relaxed text-muted-foreground before:mt-2.5 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-primary"
                    >
                      {punto}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className="mt-14 border-t border-border pt-6 text-sm text-muted-foreground">
          Última actualización: {siteConfig.legal.actualizado}.
        </p>
      </main>
    </div>
  )
}
