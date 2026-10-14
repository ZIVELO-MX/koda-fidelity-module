"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { TEMAS } from "@/lib/ayuda"

/**
 * La ayuda completa, pantalla por pantalla. Ya no es un destino de la barra
 * lateral: se llega desde el botón de ayuda del encabezado, que abre primero lo
 * de la pantalla en la que estás.
 *
 * Se fueron las seis maquetas dibujadas de la propia aplicación. Para verlas
 * había que estar dentro de la aplicación, con la pantalla real al lado.
 */
export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <Link
        href="/dashboard"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver al panel
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Documentación</h1>
        <p className="text-muted-foreground">
          Todo lo que explica la aplicación, junto. El botón de ayuda del encabezado abre
          directamente lo de la pantalla en la que estés.
        </p>
      </div>

      {TEMAS.map((tema) => (
        <section key={tema.ruta} className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{tema.titulo}</h2>
          <Accordion type="multiple" className="w-full">
            {tema.preguntas.map((entrada) => (
              <AccordionItem key={entrada.pregunta} value={entrada.pregunta}>
                <AccordionTrigger className="text-left">{entrada.pregunta}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {entrada.respuesta}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}
    </div>
  )
}
