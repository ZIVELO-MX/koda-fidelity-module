"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const layouts = [
  {
    title: "Dashboard",
    description:
      "Vista principal con resumen de métricas: total de clientes, tarjetas activas, visitas recientes y sellos canjeados.",
    mockup: (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-primary/10 p-3 space-y-1">
          <div className="h-2 w-16 rounded bg-primary/30" />
          <div className="h-6 w-8 rounded bg-primary" />
        </div>
        <div className="rounded-lg bg-blue-500/10 p-3 space-y-1">
          <div className="h-2 w-16 rounded bg-blue-500/30" />
          <div className="h-6 w-8 rounded bg-blue-500" />
        </div>
        <div className="rounded-lg bg-green-500/10 p-3 space-y-1">
          <div className="h-2 w-16 rounded bg-green-500/30" />
          <div className="h-6 w-8 rounded bg-green-500" />
        </div>
        <div className="rounded-lg bg-amber-500/10 p-3 space-y-1">
          <div className="h-2 w-16 rounded bg-amber-500/30" />
          <div className="h-6 w-8 rounded bg-amber-500" />
        </div>
      </div>
    ),
  },
  {
    title: "Sidebar de navegación",
    description:
      "Panel lateral con acceso a todas las secciones: Dashboard, Tarjetas, Clientes, Códigos QR, Marca, Configuración y Documentación. La sección activa se resalta en color.",
    mockup: (
      <div className="flex gap-4">
        <div className="w-40 shrink-0 rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="h-5 w-24 rounded bg-muted-foreground/20" />
          {["Dashboard", "Tarjetas", "Clientes", "QR", "Marca"].map(
            (name, i) => (
              <div
                key={name}
                className={`h-7 rounded flex items-center px-2 ${
                  i === 0
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`h-2 rounded ${
                    i === 0 ? "bg-primary w-16" : "bg-muted-foreground/40 w-14"
                  }`}
                />
              </div>
            )
          )}
        </div>
        <div className="flex-1 rounded-lg border border-dashed border-border bg-muted/30 p-4 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Contenido</span>
        </div>
      </div>
    ),
  },
  {
    title: "Tarjetas de Lealtad",
    description:
      "Lista de tarjetas creadas con opciones para editar, ver detalles o crear una nueva. Cada tarjeta muestra su nombre, estado y número de clientes.",
    mockup: (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 rounded bg-muted-foreground/20" />
          <div className="h-8 w-28 rounded-lg bg-primary/20" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-gradient-to-br from-primary/40 to-primary/20" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-24 rounded bg-muted-foreground/20" />
                  <div className="h-2 w-16 rounded bg-muted-foreground/10" />
                </div>
                <div className="h-5 w-14 rounded-full bg-green-500/20" />
              </div>
              <div className="h-2 w-full rounded bg-muted-foreground/10" />
              <div className="flex gap-4 text-xs text-muted-foreground">
                <div className="h-2 w-12 rounded bg-muted-foreground/10" />
                <div className="h-2 w-12 rounded bg-muted-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Clientes",
    description:
      "Tabla con todos los clientes registrados, sus tarjetas asociadas, sellos acumulados y última visita. Incluye buscador y filtros.",
    mockup: (
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="h-8 w-48 rounded-lg bg-muted" />
          <div className="h-8 w-24 rounded-lg bg-muted" />
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          {["Nombre", "Email", "Tarjeta", "Sellos"].map((header) => (
            <div
              key={header}
              className="flex items-center gap-4 px-4 py-2 border-b border-border last:border-b-0"
            >
              <div className="h-2 w-20 rounded bg-muted-foreground/20" />
              <div className="h-2 w-28 rounded bg-muted-foreground/20" />
              <div className="h-2 w-16 rounded bg-muted-foreground/20" />
              <div className="h-2 w-8 rounded bg-muted-foreground/20" />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Códigos QR",
    description:
      "Visualización y descarga de códigos QR para cada tarjeta. Puedes imprimirlos para colocarlos en tu local.",
    mockup: (
      <div className="flex gap-4 items-center">
        <div className="size-24 shrink-0 rounded-xl border-2 border-border bg-card p-2">
          <div className="grid grid-cols-5 gap-0.5 size-full">
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-[1px] ${
                  [0, 1, 2, 5, 10, 15, 20, 21, 22].includes(i)
                    ? "bg-foreground"
                    : "bg-transparent"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-muted-foreground/20" />
          <div className="h-2 w-20 rounded bg-muted-foreground/10" />
          <div className="h-7 w-24 rounded-lg bg-primary/20" />
        </div>
      </div>
    ),
  },
  {
    title: "Personalización de Marca",
    description:
      "Configura los colores, logo y apariencia de tu programa de fidelidad. Los cambios se reflejan en tiempo real.",
    mockup: (
      <div className="flex gap-4 items-start">
        <div className="space-y-3 flex-1">
          <div className="h-7 w-full rounded-lg bg-muted" />
          <div className="h-7 w-full rounded-lg bg-muted" />
          <div className="flex gap-2">
            <div className="size-8 rounded-full bg-primary" />
            <div className="size-8 rounded-full bg-blue-500" />
            <div className="size-8 rounded-full bg-green-500" />
            <div className="size-8 rounded-full bg-amber-500" />
          </div>
        </div>
        <div className="w-28 shrink-0 rounded-xl border-2 border-border bg-card p-3 space-y-2">
          <div className="size-8 rounded-lg bg-primary/20 mx-auto" />
          <div className="h-2 w-16 rounded bg-muted-foreground/20 mx-auto" />
          <div className="h-1.5 w-full rounded bg-muted-foreground/10" />
          <div className="h-1.5 w-3/4 rounded bg-muted-foreground/10 mx-auto" />
        </div>
      </div>
    ),
  },
]

const faqs = [
  {
    question: "¿Qué es Koda Fidelity?",
    answer:
      "Koda Fidelity es una plataforma de fidelización que te permite crear y gestionar tarjetas de lealtad digitales para tu negocio. Con ella puedes emitir tarjetas, registrar clientes, gestionar códigos QR y personalizar la marca de tu programa de fidelidad.",
  },
  {
    question: "¿Cómo creo una tarjeta de lealtad?",
    answer:
      "Ve a la sección 'Tarjetas de Lealtad' en el panel lateral y haz clic en 'Nueva Tarjeta'. Allí podrás configurar el nombre, la descripción, los beneficios y el diseño de tu tarjeta. Una vez creada, tus clientes podrán unirse mediante un código QR o un enlace.",
  },
  {
    question: "¿Cómo se unen los clientes a una tarjeta?",
    answer:
      "Cada tarjeta genera un enlace único y un código QR. Comparte el enlace o muestra el código QR en tu local para que los clientes puedan unirse escaneándolo con su teléfono. También puedes copiar el enlace y enviarlo por mensaje o email.",
  },
  {
    question: "¿Cómo gestiono los clientes?",
    answer:
      "En la sección 'Clientes' del panel puedes ver todos los clientes registrados, sus tarjetas asociadas, el historial de visitas y sellos acumulados. Desde allí también puedes buscar clientes por nombre o email.",
  },
  {
    question: "¿Qué tipos de programas de fidelidad puedo crear?",
    answer:
      "Actualmente soportamos programas basados en sellos (stamps): el cliente acumula visitas o compras y al llegar a cierto número obtiene un beneficio. Pronto añadiremos más tipos como puntos, cashback y niveles.",
  },
  {
    question: "¿Cómo personalizo la marca de mi programa?",
    answer:
      "Ve a la sección 'Marca' en el panel lateral. Allí puedes subir tu logo, cambiar los colores principales, y personalizar la apariencia de las tarjetas y emails que reciben tus clientes.",
  },
  {
    question: "¿Cómo funcionan los códigos QR?",
    answer:
      "Cada tarjeta tiene un código QR único que puedes descargar e imprimir. Cuando un cliente lo escanea, puede unirse a la tarjeta o registrar una visita. Puedes gestionar todos los códigos QR desde la sección 'Códigos QR'.",
  },
  {
    question: "¿Puedo tener múltiples tarjetas o sucursales?",
    answer:
      "Sí, puedes crear todas las tarjetas que necesites, cada una con su propio diseño y configuración. Esto es ideal si tienes múltiples sucursales o distintos programas de fidelidad.",
  },
  {
    question: "¿Cómo veo las estadísticas de mi programa?",
    answer:
      "El panel principal de 'Dashboard' te muestra un resumen con el total de clientes, tarjetas activas, visitas recientes y más. Pronto añadiremos reportes más detallados.",
  },
  {
    question: "¿Los clientes necesitan una cuenta para unirse?",
    answer:
      "No, los clientes pueden unirse escaneando un código QR o abriendo el enlace de invitación. Solo necesitan proporcionar su nombre y email para registrarse en tu programa de fidelidad.",
  },
]

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <Link
        href="/dashboard"
        className="lg:hidden inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al Panel
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Documentación
        </h1>
        <p className="text-muted-foreground">
          Conoce la plataforma Koda Fidelity con ejemplos visuales de cada sección.
        </p>
      </div>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">
          Layout de la Aplicación
        </h2>
        <div className="grid gap-6">
          {layouts.map((layout) => (
            <div
              key={layout.title}
              className="rounded-xl border border-border bg-card p-5 space-y-4 overflow-hidden"
            >
              <div className="space-y-1">
                <h3 className="font-medium">{layout.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {layout.description}
                </p>
              </div>
              {layout.mockup}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">
          Preguntas Frecuentes
        </h2>
        <Accordion type="multiple" className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  )
}
