"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { OnboardingStep } from "@/lib/onboarding"

/**
 * El progreso se ve desde el primer momento, con los obligatorios sólidos y los
 * que se pueden saltar en contorno. Enseñar cuántos pasos hay y cuáles se
 * pueden saltar es lo que evita la sensación de formulario sin final.
 *
 * Los pasos son los del servidor, no una lista propia: quien manda sobre en
 * qué punto va el alta es `OnboardingProgress`.
 */
const PASOS: { id: OnboardingStep; etiqueta: string; obligatorio: boolean }[] = [
  { id: "INTRO", etiqueta: "Intro", obligatorio: false },
  { id: "BUSINESS", etiqueta: "Datos", obligatorio: true },
  { id: "CARD", etiqueta: "Tarjeta", obligatorio: true },
  { id: "ACQUISITION", etiqueta: "Origen", obligatorio: false },
  { id: "PAYWALL", etiqueta: "Plan", obligatorio: true },
]

const ORDEN = PASOS.map((p) => p.id)

export function BarraDePasos({ actual }: { actual: OnboardingStep }) {
  const iActual = ORDEN.indexOf(actual)

  return (
    <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
      {PASOS.map((paso, i) => {
        const hecho = ORDEN.indexOf(paso.id) < iActual
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
              {!paso.obligatorio && !hecho && <span className="font-normal opacity-70">· opcional</span>}
            </span>
            {i < PASOS.length - 1 && <span aria-hidden="true" className="h-px w-3 bg-border sm:w-5" />}
          </li>
        )
      })}
    </ol>
  )
}
