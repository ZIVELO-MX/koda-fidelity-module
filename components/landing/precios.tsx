"use client"

import Link from "next/link"
import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { cuentaDelAnual, mesesGratisExactos, pesos } from "@/lib/precios"
import { PLANES, PRECIOS_VIGENTES_DESDE } from "@/lib/planes"

type Modalidad = "anual" | "mensual"

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
                "inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors",
                modalidad === opcion.valor
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opcion.etiqueta}
              {opcion.valor === "anual" && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-bold",
                    modalidad === "anual" ? "bg-white/20" : "bg-primary/15 text-primary",
                  )}
                >
                  {mesesGratisExactos(PLANES[0].mensual, PLANES[0].anual)} meses gratis
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {PLANES.map((plan) => {
          const importe = modalidad === "anual" ? plan.anual : plan.mensual
          const periodo = modalidad === "anual" ? "al año" : "al mes"
          // Los dos planes se veían idénticos, así que la sección no decía cuál
          // es cuál. El de arriba manda, como en el diseño aprobado.
          const destacado = Boolean(plan.insignia)
          const cuenta = cuentaDelAnual(plan.mensual, plan.anual)
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl p-6 text-left sm:p-8",
                destacado
                  ? "bg-[#17130f] text-[#FAFAF7] shadow-[0_30px_60px_-24px_rgba(30,15,0,.6)]"
                  : "border border-border bg-card",
              )}
            >
              {plan.insignia && (
                <span className="absolute -top-3 left-8 rounded-full bg-primary px-3.5 py-1 text-xs font-bold text-primary-foreground">
                  {plan.insignia}
                </span>
              )}
              <h3 className={cn("text-xl font-semibold", destacado ? "text-white" : "text-foreground")}>
                {plan.nombre}
              </h3>
              <p className={cn("mt-1 text-sm", destacado ? "text-[#FAFAF7]/70" : "text-muted-foreground")}>
                {plan.resumen}
              </p>

              <p className="mt-6 flex items-baseline gap-1.5">
                <span className={cn("text-4xl font-bold tracking-tight", destacado ? "text-white" : "text-foreground")}>
                  ${PESOS.format(importe)}
                </span>
                <span className={cn("text-sm", destacado ? "text-[#FAFAF7]/70" : "text-muted-foreground")}>
                  MXN {periodo}
                </span>
              </p>
              {modalidad === "anual" ? (
                <>
                  <p className={cn("mt-2 text-sm font-medium", destacado ? "text-white" : "text-foreground")}>
                    Equivale a ${pesos(cuenta.porMes)} al mes, y se cobra una vez al año.
                  </p>
                  {/* Sin tachado: el año mes a mes no es un precio anterior,
                      es la otra modalidad y sigue disponible. */}
                  <p className={cn("mt-1 text-sm", destacado ? "text-[#FAFAF7]/75" : "text-muted-foreground")}>
                    Pagando mes a mes, el año costaría ${pesos(cuenta.doceMeses)}. Ahorras $
                    {pesos(cuenta.ahorro)}.
                  </p>
                </>
              ) : (
                <p className={cn("mt-2 text-sm", destacado ? "text-[#FAFAF7]/75" : "text-muted-foreground")}>
                  Sin permanencia. Pagando por año equivale a{" "}
                  <span className={cn("font-semibold", destacado ? "text-white" : "text-foreground")}>
                    ${pesos(cuenta.porMes)} al mes
                  </span>
                  .
                </p>
              )}

              <ul className="mt-7 space-y-3">
                {plan.incluye.map((linea) => (
                  <li
                    key={linea}
                    className={cn("flex items-start gap-2.5 text-sm", destacado ? "text-[#FAFAF7]/90" : "text-foreground/80")}
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {linea}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="space-y-3 text-center">
        <Button asChild size="lg" className="min-h-11 px-8">
          <Link href="/signup">Empieza por solo $149 al mes</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Crear tu cuenta y diseñar tu tarjeta no cuesta. El plan se contrata cuando la publicas.
        </p>
        {/* Señal de vigencia: con precios a la vista, saber desde cuándo rigen
            es la diferencia entre un dato y un dato que igual ya caducó. */}
        <p className="text-xs text-muted-foreground/80">
          Precios vigentes desde {PRECIOS_VIGENTES_DESDE}.
        </p>
      </div>
    </div>
  )
}
