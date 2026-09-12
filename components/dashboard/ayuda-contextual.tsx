"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { CircleQuestionMark, ArrowRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { temaDe } from "@/lib/ayuda"

/**
 * La ayuda de la pantalla en la que estás, desde el encabezado. Sustituye a una
 * sección de navegación que había que ir a buscar y que hablaba de todas las
 * pantallas menos de la que tenías delante.
 */
export function AyudaContextual() {
  const [abierta, setAbierta] = useState(false)
  const tema = temaDe(usePathname())

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setAbierta(true)}
            aria-label={tema ? `Ayuda de ${tema.titulo}` : "Ayuda"}
            className="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CircleQuestionMark className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Ayuda de esta pantalla</TooltipContent>
      </Tooltip>

      <Dialog open={abierta} onOpenChange={setAbierta}>
        <DialogContent className="sm:max-w-lg max-h-[85svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tema ? tema.titulo : "Ayuda"}</DialogTitle>
            <DialogDescription>
              {tema
                ? "Lo que suele hacer falta en esta pantalla."
                : "Esta pantalla todavía no tiene ayuda propia."}
            </DialogDescription>
          </DialogHeader>

          {tema && (
            <Accordion type="multiple" defaultValue={["p-0"]} className="w-full">
              {tema.preguntas.map((entrada, i) => (
                <AccordionItem key={entrada.pregunta} value={`p-${i}`}>
                  <AccordionTrigger className="text-left text-sm">
                    {entrada.pregunta}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {entrada.respuesta}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          <Link
            href="/dashboard/docs"
            onClick={() => setAbierta(false)}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Ver la ayuda completa
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </DialogContent>
      </Dialog>
    </>
  )
}
