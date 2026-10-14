"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Loader2, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fallaDe, SIN_CONEXION, type Fallo } from "@/lib/fallos-de-api"
import { cn } from "@/lib/utils"

/**
 * El histórico del panel, servido por `GET /api/dashboard/stats`.
 *
 * El resto del panel consulta Prisma desde el servidor y pinta el día de hoy.
 * Esto es lo otro: el periodo, su serie diaria y qué tarjetas mueven de verdad.
 * Va por la API a propósito, porque es la superficie donde el contrato FID-C1
 * tiene que sostenerse entero: carga, vacío, permiso, error y dato parcial.
 *
 * Nada se inventa. Un canje sin ciclos completados no es 0%, es que todavía no
 * hay de dónde sacarlo, y una tarjeta sin movimiento no lleva fecha falsa.
 */

const PERIODOS = [7, 30, 90] as const

type Periodo = (typeof PERIODOS)[number]

type Estadisticas = {
  period: { from: string; to: string; timezone: string }
  totals: {
    activeCards: number
    activeCustomers: number
    stamps: number
    redemptions: number
    completedCycles: number
    /** `null` cuando no hay ciclos completados: es falta de dato, no un cero. */
    redemptionRate: number | null
  }
  daily: { date: string; stamps: number; redemptions: number }[]
  weeklyNewCustomers: { weekStart: string; count: number }[]
  topCards: { id: string; name: string; stamps: number; redemptions: number; lastActivityAt: string | null }[]
}

const DIA_CORTO = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" })

const numero = new Intl.NumberFormat("es-MX")

export function MetricasHistoricas() {
  const [dias, setDias] = useState<Periodo>(30)
  const [datos, setDatos] = useState<Estadisticas | null>(null)
  const [fallo, setFallo] = useState<Fallo | null>(null)
  const [cargando, setCargando] = useState(true)

  const pedir = useCallback(async (periodo: Periodo, vivo: () => boolean) => {
    setCargando(true)
    setFallo(null)
    let respuesta: Response
    try {
      respuesta = await fetch(`/api/dashboard/stats?days=${periodo}`)
    } catch {
      // Sin respuesta no hay `requestId` que enseñar: la petición no llegó.
      if (vivo()) {
        setFallo(SIN_CONEXION)
        setCargando(false)
      }
      return
    }
    const requestId = respuesta.headers.get("x-request-id") ?? undefined
    const cuerpo = (await respuesta.json().catch(() => null)) as Record<string, unknown> | null
    if (!vivo()) return
    if (!respuesta.ok) {
      setFallo(fallaDe(respuesta.status, cuerpo, requestId, "tus métricas"))
      setDatos(null)
    } else if (!cuerpo || typeof cuerpo !== "object" || !("totals" in cuerpo)) {
      // Contrato roto: se dice, no se pinta un panel vacío como si no hubiera
      // pasado nada.
      setFallo({ titulo: "La respuesta no tiene la forma esperada", detalle: "El servidor contestó algo que esta pantalla no sabe leer.", requestId, reintentable: true })
      setDatos(null)
    } else {
      setDatos(cuerpo as unknown as Estadisticas)
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    let activo = true
    // El primer pedido sale en el siguiente turno, no dentro del efecto: pone
    // el estado de carga, y React avisa de un setState síncrono aquí. Es el
    // mismo rodeo que usa el panel de cierre de cuenta.
    const turno = window.setTimeout(() => {
      void pedir(dias, () => activo)
    }, 0)
    return () => {
      activo = false
      window.clearTimeout(turno)
    }
  }, [dias, pedir])

  const sinActividad =
    datos !== null && datos.totals.stamps === 0 && datos.totals.redemptions === 0 && datos.totals.completedCycles === 0

  return (
    <section aria-labelledby="metricas-titulo" className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 id="metricas-titulo" className="font-semibold text-foreground">
              Cómo va tu programa
            </h2>
            <p className="text-sm text-muted-foreground">Lo que pasó en el periodo, no solo hoy.</p>
          </div>
        </div>

        <div role="radiogroup" aria-label="Periodo" className="inline-flex rounded-full border border-border p-1">
          {PERIODOS.map((periodo) => (
            <button
              key={periodo}
              type="button"
              role="radio"
              aria-checked={dias === periodo}
              onClick={() => setDias(periodo)}
              className={cn(
                "inline-flex min-h-10 min-w-11 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors",
                dias === periodo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {periodo} días
            </button>
          ))}
        </div>
      </div>

      {cargando && (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando tus métricas de {dias} días…
        </div>
      )}

      {!cargando && fallo && (
        <div role="alert" className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">{fallo.titulo}</p>
              <p className="text-sm text-muted-foreground">{fallo.detalle}</p>
              {fallo.accion && <p className="text-sm text-muted-foreground">{fallo.accion}</p>}
              {/* El identificador es lo único que vuelve útil un reporte de
                  soporte, así que se enseña en vez de esconderse en la consola. */}
              {fallo.requestId && (
                <p className="font-mono text-xs text-muted-foreground">Referencia: {fallo.requestId}</p>
              )}
            </div>
          </div>
          {fallo.reintentable && (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => void pedir(dias, () => true)}>
              Reintentar
            </Button>
          )}
        </div>
      )}

      {!cargando && !fallo && datos && sinActividad && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Todavía no hay movimiento en estos {dias} días. En cuanto selles la primera tarjeta, aquí
          aparece.
        </p>
      )}

      {!cargando && !fallo && datos && !sinActividad && <Resumen datos={datos} dias={dias} />}
    </section>
  )
}

function Resumen({ datos, dias }: { datos: Estadisticas; dias: Periodo }) {
  const { totals, daily, topCards } = datos
  const tope = Math.max(1, ...daily.map((d) => d.stamps + d.redemptions))

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Dato etiqueta="Sellos" valor={numero.format(totals.stamps)} />
        <Dato etiqueta="Canjes" valor={numero.format(totals.redemptions)} />
        <Dato etiqueta="Tarjetas llenadas" valor={numero.format(totals.completedCycles)} />
        {/* `null` no es cero: es que no hay ciclos completados de los que salga
            un porcentaje. Decir 0% sería inventar un dato malo. */}
        <Dato
          etiqueta="Canje por tarjeta llena"
          valor={totals.redemptionRate === null ? "—" : `${Math.round(totals.redemptionRate * 100)}%`}
          nota={totals.redemptionRate === null ? "Sin tarjetas llenas todavía" : undefined}
        />
      </dl>

      <figure className="space-y-2">
        <figcaption className="text-xs text-muted-foreground">
          Sellos y canjes por día, {dias} días
        </figcaption>
        {/* La serie se dibuja con la escala de su propio máximo, y cada barra
            lleva su cifra en el título para quien no distingue alturas. */}
        <div className="flex h-24 items-end gap-px overflow-x-auto" role="img" aria-label={`Serie diaria de ${dias} días`}>
          {daily.map((dia) => {
            const total = dia.stamps + dia.redemptions
            return (
              <div
                key={dia.date}
                title={`${DIA_CORTO.format(new Date(`${dia.date}T12:00:00`))}: ${dia.stamps} sellos, ${dia.redemptions} canjes`}
                className="flex min-w-[6px] flex-1 flex-col justify-end"
                style={{ height: "100%" }}
              >
                <div
                  className="w-full rounded-t-sm bg-primary/70"
                  style={{ height: `${Math.round((total / tope) * 100)}%` }}
                />
              </div>
            )
          })}
        </div>
      </figure>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Tus tarjetas, por movimiento</h3>
        {topCards.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no tienes tarjetas.</p>
        ) : (
          <ul className="divide-y divide-border">
            {topCards.map((tarjeta) => (
              <li key={tarjeta.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="font-medium text-foreground">{tarjeta.name}</span>
                <span className="text-sm text-muted-foreground">
                  {numero.format(tarjeta.stamps)} sellos · {numero.format(tarjeta.redemptions)} canjes ·{" "}
                  {/* Sin actividad no se inventa una fecha. */}
                  {tarjeta.lastActivityAt
                    ? DIA_CORTO.format(new Date(tarjeta.lastActivityAt))
                    : "sin movimiento"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Dato({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{valor}</dd>
      {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
    </div>
  )
}
