"use client"

import Link from "next/link"
import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Modalidad = "anual" | "mensual"

/**
 * Los importes vienen de la decisión de precios confirmados del ciclo: Lite 149
 * y Pro 299 al mes, y el anual son doce meses pagando diez. Antes esta sección
 * decía "Precios por definir" y "se publicará próximamente", que es prometer sin
 * respaldo, justo lo que esta ola quita de la página.
 */
const PLANES = [
  {
    id: "lite",
    nombre: "Lite",
    resumen: "Para empezar con una tarjeta",
    mensual: 149,
    anual: 1490,
    incluye: [
      "Una tarjeta de lealtad activa",
      "Altas por QR y por enlace",
      "Sellado y canje desde el escáner",
      "El primer mes con todo lo de Pro",
    ],
  },
  {
    id: "pro",
    nombre: "Pro",
    resumen: "Para varias tarjetas o sucursales",
    mensual: 299,
    anual: 2990,
    incluye: [
      "Varias tarjetas activas a la vez",
      "Todos los diseños de tarjeta",
      "Altas por QR y por enlace",
      "Sellado y canje desde el escáner",
    ],
  },
]

const PESOS = new Intl.NumberFormat("es-MX")

export function Precios() {
  // El anual va preseleccionado porque es el que se recomienda.
  const [modalidad, setModalidad] = useState<Modalidad>("anual")

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <div
          role="radiogroup"
          aria-label="Modalidad de cobro"
          className="inline-flex rounded-full border border-border bg-card p-1"
        >
          {(
            [
              { valor: "anual", etiqueta: "Al año" },
              { valor: "mensual", etiqueta: "Al mes" },
            ] as const
          ).map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              role="radio"
              aria-checked={modalidad === opcion.valor}
              onClick={() => setModalidad(opcion.valor)}
              className={cn(
                "min-h-10 rounded-full px-5 text-sm font-medium transition-colors",
                modalidad === opcion.valor
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {modalidad === "anual" && (
        <p className="text-center text-sm font-medium text-primary">
          Pagas diez meses y recibes doce. Dos meses gratis.
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {PLANES.map((plan) => {
          const importe = modalidad === "anual" ? plan.anual : plan.mensual
          const periodo = modalidad === "anual" ? "al año" : "al mes"
          return (
            <div
              key={plan.id}
              className="flex flex-col rounded-3xl border border-border bg-card p-6 text-left sm:p-8"
            >
              <h3 className="text-xl font-semibold text-foreground">{plan.nombre}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.resumen}</p>

              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight text-foreground">
                  ${PESOS.format(importe)}
                </span>
                <span className="text-sm text-muted-foreground">MXN {periodo}</span>
              </p>
              {modalidad === "anual" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Equivale a ${PESOS.format(plan.mensual)} MXN al mes.
                </p>
              )}

              <ul className="mt-6 space-y-2.5">
                {plan.incluye.map((linea) => (
                  <li key={linea} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {linea}
                  </li>
                ))}
              </ul>

              <Button asChild size="lg" className="mt-8 min-h-11 w-full">
                <Link href="/signup">Empezar Gratis</Link>
              </Button>
            </div>
          )
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Crear tu cuenta y diseñar tu tarjeta no cuesta. El plan se contrata cuando la publicas.
      </p>
    </div>
  )
}
