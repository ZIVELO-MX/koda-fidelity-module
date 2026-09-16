"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { ORDEN, PASOS_EN_LA_BARRA, type PasoId } from "@/lib/onboarding"

/**
 * El progreso se ve desde el primer momento, con los obligatorios sólidos y
 * los que se pueden saltar en contorno. Enseñar cuántos pasos hay y cuáles se
 * pueden saltar es lo que evita la sensación de formulario sin final.
 */
export function BarraDePasos({ actual }: { actual: PasoId }) {
  const iActual = ORDEN.indexOf(actual)

  return (
    <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
      {PASOS_EN_LA_BARRA.map((paso, i) => {
        const iPaso = ORDEN.indexOf(paso.id)
        const hecho = iPaso < iActual
        const aqui = paso.id === actual

        return (
          <li key={paso.id} className="flex items-center gap-2">
            <span
              aria-current={aqui ? "step" : undefined}
              className={cn(
                "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
                hecho && "bg-primary/10 text-primary",
                aqui && paso.obligatorio && "bg-primary text-primary-foreground",
                aqui && !paso.obligatorio && "border border-primary text-primary",
                !hecho && !aqui && paso.obligatorio && "bg-muted text-muted-foreground",
                !hecho && !aqui && !paso.obligatorio && "border border-border text-muted-foreground",
              )}
            >
              {hecho && <Check className="h-3 w-3" aria-hidden="true" />}
              {paso.etiqueta}
              {!paso.obligatorio && !hecho && (
                <span className="font-normal opacity-70">· opcional</span>
              )}
            </span>
            {i < PASOS_EN_LA_BARRA.length - 1 && (
              <span aria-hidden="true" className="h-px w-3 bg-border sm:w-5" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
