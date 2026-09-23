"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Impact = {
  business: { name: string }
  cards: number
  customers: number
  gracePeriodDays?: number
  scheduledClosure: { scheduledFor: string } | null
}

const PALABRA = "BORRAR"

const fecha = (valor: string | Date) =>
  new Date(valor).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })

export function AccountClosurePanel() {
  const [impact, setImpact] = useState<Impact | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [escrito, setEscrito] = useState("")
  const [limite, setLimite] = useState<Date | null>(null)

  const load = async () => {
    const response = await fetch("/api/account/deletion-impact")
    if (response.ok) setImpact(await response.json())
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const change = async (action: "schedule" | "cancel") => {
    setBusy(true); setError(null)
    try {
      const response = await fetch("/api/account/closure", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "cancel" ? { action } : {}) })
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "No fue posible actualizar el cierre")
      setConfirmando(false)
      setEscrito("")
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible actualizar el cierre") } finally { setBusy(false) }
  }

  const scheduledFor = impact?.scheduledClosure?.scheduledFor
  const dias = impact?.gracePeriodDays ?? 30

  return <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
    <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" /><div><h2 className="font-semibold">Cerrar cuenta</h2><p className="text-sm text-muted-foreground">{scheduledFor ? `La cuenta está en sólo lectura hasta el ${fecha(scheduledFor)}. Cancela el cierre y todo vuelve a funcionar.` : `Programa el cierre definitivo después de ${dias} días de sólo lectura.`}</p></div></div>
    {impact && !scheduledFor && <p className="text-sm text-muted-foreground">Se eliminarán {impact.cards} tarjetas y {impact.customers} clientes del negocio; el historial se anonimiza.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="button" variant="destructive" className="min-h-11" disabled={busy} onClick={() => {
      if (scheduledFor) { void change("cancel"); return }
      // La fecha se fija al abrir, no en cada render: el diálogo debe decir el
      // mismo día mientras está abierto.
      setLimite(new Date(Date.now() + dias * 24 * 60 * 60 * 1000))
      setConfirmando(true)
    }}>
      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{scheduledFor ? "Cancelar cierre" : "Programar cierre"}
    </Button>

    {/* Es la acción de mayor consecuencia del producto: no se dispara con un
        clic. La consecuencia se cuenta con los datos que la pantalla ya tiene y
        la fecha dice cuándo deja de haber vuelta atrás. */}
    <AlertDialog open={confirmando} onOpenChange={(abierto) => { setConfirmando(abierto); if (!abierto) setEscrito("") }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cerrar tu cuenta{impact ? ` de ${impact.business.name}` : ""}?</AlertDialogTitle>
          <AlertDialogDescription>
            {impact ? `Se cierran ${impact.cards} tarjetas y se pierde el progreso de ${impact.customers} clientes. ` : ""}
            La cuenta queda en sólo lectura y se puede reactivar hasta el {limite ? fecha(limite) : `${dias} días`}. Después, el borrado es definitivo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cierre-confirmacion">Escribe {PALABRA} para confirmar</Label>
          <Input id="cierre-confirmacion" value={escrito} onChange={(e) => setEscrito(e.target.value)} autoComplete="off" />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
          <Button type="button" variant="destructive" className="min-h-11" disabled={busy || escrito.trim().toUpperCase() !== PALABRA} onClick={() => void change("schedule")}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cerrar cuenta
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
}
