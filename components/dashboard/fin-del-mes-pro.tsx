"use client"

import { useState, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { SolicitudCreada } from "@/components/onboarding/alta"
import type { AvisoDeFinDeMes } from "@/lib/fin-del-mes-pro"
import { PLANES } from "@/lib/planes"
import { pesos } from "@/lib/precios"
import { solicitarActivacion, type Solicitud } from "@/lib/solicitudes-de-activacion"

type Fallo = { titulo: string; detalle: string; requestId?: string; reintentable: boolean }
type Estado =
  | { tipo: "inactivo" }
  | { tipo: "enviando" }
  | { tipo: "hecho"; solicitud: Solicitud }
  | { tipo: "fallo"; fallo: Fallo }

/**
 * «Tu mes con Pro termina en 3 días», del wireframe. Enseña el cambio en vez de
 * describirlo: la tarjeta con su acabado Pro al lado de cómo quedará con Lite, y
 * qué tarjetas se desactivan, que es lo que más pesa y lo que nadie espera.
 *
 * «Continuar con Lite» es una salida legítima con su propio botón: no se
 * esconde ni se disfraza de rechazo. Lo oculta para esta suscripción en este
 * navegador; es una comodidad, no un dato que haya que guardar.
 *
 * «Mantener Pro» no cobra, porque no hay proveedor de cobro: abre la misma
 * solicitud manual con folio del muro, y soporte la activa.
 *
 * `localStorage` se lee con `useSyncExternalStore`: en el servidor no hay nada
 * que leer y el aviso no se pinta; en el navegador aparece si no se descartó.
 * Así quien ya lo descartó no lo ve parpadear en cada página, y la fecha se
 * formatea en el navegador, sin desajustes de hidratación.
 */
export function FinDelMesPro({
  aviso,
  negocio,
  correo,
}: {
  aviso: AvisoDeFinDeMes
  negocio: string
  correo: string | null
}) {
  const clave = `koda:fin-del-mes-pro:${aviso.suscripcionId}`
  // `null` en el servidor: todavía no se sabe, así que no se pinta.
  const descartado = useSyncExternalStore(suscribirAlAlmacen, () => leerDescartado(clave), () => null)
  // Guardar en `localStorage` no avisa a la propia pestaña, así que el cierre
  // de ahora se lleva aparte.
  const [cerradoAhora, setCerradoAhora] = useState(false)
  const [estado, setEstado] = useState<Estado>({ tipo: "inactivo" })
  const [copiado, setCopiado] = useState(false)

  if (descartado !== false || cerradoAhora) return null

  const pro = PLANES.find((p) => p.id === "pro")!
  // `pesos` formatea sin símbolo; cada llamador pone el suyo.
  const precio = aviso.intervalo === "ANNUAL" ? `$${pesos(pro.anual)} al año` : `$${pesos(pro.mensual)} al mes`
  const fecha = new Date(aviso.terminaEl).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
  const cuando = aviso.diasRestantes <= 1 ? `el ${fecha}` : `en ${aviso.diasRestantes} días, el ${fecha}`

  const continuarConLite = () => {
    try {
      window.localStorage.setItem(clave, "1")
    } catch {
      // Si no se puede recordar, al menos se cierra ahora.
    }
    setCerradoAhora(true)
  }

  const mantenerPro = async () => {
    setEstado({ tipo: "enviando" })
    const resultado = await solicitarActivacion("PRO", aviso.intervalo)
    if (resultado.ok && resultado.solicitud) return setEstado({ tipo: "hecho", solicitud: resultado.solicitud })
    setEstado({
      tipo: "fallo",
      fallo: resultado.ok
        ? { titulo: "La solicitud no trajo folio", detalle: "Inténtalo de nuevo; si se repite, escribe a soporte.", reintentable: true }
        : resultado.fallo,
    })
  }

  const cambian = aviso.seDesactivan.length > 0
  const conAcabado = aviso.tarjetaConAcabado

  return (
    <details className="group mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-foreground" open={estado.tipo !== "inactivo" || undefined}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
        <span>Tu mes con Pro termina {cuando}</span>
        <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
      </summary>

      <div className="space-y-4 border-t border-amber-500/20 px-4 py-4">
        {conAcabado && (
          <div className="space-y-3">
            <p>Con Lite, «{conAcabado.name}» usa el color que elegiste en lugar de su acabado Pro.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {([["Hoy, con Pro", conAcabado.themeCode], ["Con Lite", null]] as const).map(([rotulo, codigo]) => (
                <figure key={rotulo} className="space-y-2">
                  <figcaption className="text-center text-xs text-muted-foreground">{rotulo}</figcaption>
                  <LoyaltyCardPreview
                    businessName={negocio}
                    currentStamps={0}
                    maxStamps={conAcabado.stampsRequired}
                    reward={conAcabado.reward}
                    brandColor={conAcabado.brandColor}
                    themeCode={codigo}
                    showQR={false}
                    className="max-w-[240px]"
                  />
                </figure>
              ))}
            </div>
          </div>
        )}

        {cambian && (
          <p>
            Con Lite queda activa una sola tarjeta, «{aviso.seQueda}».{" "}
            {aviso.seDesactivan.length === 1 ? `«${aviso.seDesactivan[0]}» se desactiva` : `${aviso.seDesactivan.map((n) => `«${n}»`).join(", ")} se desactivan`}{" "}
            hasta que vuelvas a Pro. Quien las escanee verá que están temporalmente desactivadas, y sus sellos se conservan.
          </p>
        )}

        {!conAcabado && !cambian && <p>Con Lite tus tarjetas se quedan como están.</p>}

        {estado.tipo === "hecho" ? (
          <SolicitudCreada solicitud={estado.solicitud} negocio={negocio} correo={correo} copiado={copiado} onCopiar={setCopiado} />
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button onClick={mantenerPro} disabled={estado.tipo === "enviando"} className="min-h-11">
              {estado.tipo === "enviando" ? "Pidiendo…" : `Mantener Pro por ${precio}`}
            </Button>
            <Button variant="outline" onClick={continuarConLite} className="min-h-11">
              Continuar con Lite
            </Button>
          </div>
        )}

        {estado.tipo === "fallo" && (
          <div role="alert" className="space-y-1">
            <p className="font-medium">{estado.fallo.titulo}</p>
            <p className="text-muted-foreground">{estado.fallo.detalle}</p>
            {estado.fallo.requestId && <p className="font-mono text-xs text-muted-foreground">Referencia: {estado.fallo.requestId}</p>}
          </div>
        )}
      </div>
    </details>
  )
}

function suscribirAlAlmacen(avisar: () => void) {
  window.addEventListener("storage", avisar)
  return () => window.removeEventListener("storage", avisar)
}

function leerDescartado(clave: string) {
  try {
    return window.localStorage.getItem(clave) === "1"
  } catch {
    // Sin almacenamiento (ventana privada, datos bloqueados) el aviso se ve.
    return false
  }
}
