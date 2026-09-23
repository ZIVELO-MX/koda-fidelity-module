"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fallaDe, SIN_CONEXION, type Fallo } from "@/lib/fallos-de-api"

/**
 * La actividad del negocio, servida por `GET /api/dashboard/activity`.
 *
 * El panel ya enseña los diez últimos movimientos desde el servidor. Esto es lo
 * que falta: poder seguir hacia atrás. La paginación es por cursor, así que se
 * conserva el `nextCursor` que manda el servidor en vez de contar páginas, y
 * cuando llega `null` se deja de ofrecer "ver más" en lugar de pedir una página
 * vacía.
 *
 * `customerName` y `cardName` pueden venir `null` por contrato. Un movimiento
 * sin cliente no se rellena con una cadena vacía ni con un nombre inventado: se
 * dice que no lo tiene.
 */

type Movimiento = {
  id: string
  type: string
  customerName: string | null
  cardName: string | null
  createdAt: string
}

const NOMBRES: Record<string, string> = {
  stamp: "Sello",
  redeem: "Canje",
  completion: "Tarjeta llena",
  customer_joined: "Nuevo cliente",
  milestone: "Sorpresa",
}

const MOMENTO = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

export function ActividadPaginada() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [primeraCarga, setPrimeraCarga] = useState(true)
  const [cargando, setCargando] = useState(false)
  const [fallo, setFallo] = useState<Fallo | null>(null)

  const pedir = useCallback(async (desde: string | null, vivo: () => boolean) => {
    setCargando(true)
    setFallo(null)
    let respuesta: Response
    try {
      respuesta = await fetch(`/api/dashboard/activity?limit=20${desde ? `&cursor=${encodeURIComponent(desde)}` : ""}`)
    } catch {
      if (vivo()) {
        setFallo(SIN_CONEXION)
        setCargando(false)
        setPrimeraCarga(false)
      }
      return
    }
    const requestId = respuesta.headers.get("x-request-id") ?? undefined
    const cuerpo = (await respuesta.json().catch(() => null)) as Record<string, unknown> | null
    if (!vivo()) return

    if (!respuesta.ok) {
      setFallo(fallaDe(respuesta.status, cuerpo, requestId, "la actividad"))
    } else if (!cuerpo || !Array.isArray(cuerpo.items)) {
      setFallo({
        titulo: "La respuesta no tiene la forma esperada",
        detalle: "El servidor contestó algo que esta pantalla no sabe leer.",
        requestId,
        reintentable: true,
      })
    } else {
      const pagina = cuerpo.items as Movimiento[]
      // Se acumula: "ver más" continúa la lista, no la sustituye.
      setMovimientos((previos) => (desde ? [...previos, ...pagina] : pagina))
      setCursor(typeof cuerpo.nextCursor === "string" ? cuerpo.nextCursor : null)
    }
    setCargando(false)
    setPrimeraCarga(false)
  }, [])

  useEffect(() => {
    let activo = true
    // El primer pedido sale en el siguiente turno, no dentro del efecto: pone
    // el estado de carga, y React avisa de un setState síncrono aquí. Es el
    // mismo rodeo que usa el panel de cierre de cuenta.
    const turno = window.setTimeout(() => {
      void pedir(null, () => activo)
    }, 0)
    return () => {
      activo = false
      window.clearTimeout(turno)
    }
  }, [pedir])

  return (
    <section aria-labelledby="actividad-titulo" className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div>
        <h2 id="actividad-titulo" className="font-semibold text-foreground">
          Toda la actividad
        </h2>
        <p className="text-sm text-muted-foreground">Cada sello, canje y alta, del más reciente hacia atrás.</p>
      </div>

      {primeraCarga && cargando && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando la actividad…
        </div>
      )}

      {fallo && (
        <div role="alert" className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">{fallo.titulo}</p>
              <p className="text-sm text-muted-foreground">{fallo.detalle}</p>
              {fallo.accion && <p className="text-sm text-muted-foreground">{fallo.accion}</p>}
              {fallo.requestId && (
                <p className="font-mono text-xs text-muted-foreground">Referencia: {fallo.requestId}</p>
              )}
            </div>
          </div>
          {fallo.reintentable && (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => void pedir(cursor, () => true)}>
              Reintentar
            </Button>
          )}
        </div>
      )}

      {!primeraCarga && !fallo && movimientos.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay movimientos. El primero aparece en cuanto selles una tarjeta.
        </p>
      )}

      {movimientos.length > 0 && (
        <ul className="divide-y divide-border">
          {movimientos.map((movimiento) => (
            <li key={movimiento.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <span className="text-sm text-foreground">
                <span className="font-medium">{NOMBRES[movimiento.type] ?? movimiento.type}</span>
                {/* Sin cliente o sin tarjeta se dice, no se rellena. */}
                {movimiento.customerName ? ` · ${movimiento.customerName}` : " · sin cliente"}
                {movimiento.cardName ? ` · ${movimiento.cardName}` : " · sin tarjeta"}
              </span>
              <time dateTime={movimiento.createdAt} className="text-xs tabular-nums text-muted-foreground">
                {MOMENTO.format(new Date(movimiento.createdAt))}
              </time>
            </li>
          ))}
        </ul>
      )}

      {/* Sin cursor no hay más páginas: el botón desaparece en vez de pedir una
          página vacía y decir "no hay más" después de esperar. */}
      {cursor && !fallo && (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          disabled={cargando}
          onClick={() => void pedir(cursor, () => true)}
        >
          {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Ver más
        </Button>
      )}
    </section>
  )
}
