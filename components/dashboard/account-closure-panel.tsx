"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Impact = { business: { name: string }; cards: number; customers: number; scheduledClosure: { scheduledFor: string } | null }

export function AccountClosurePanel() {
  const [impact, setImpact] = useState<Impact | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible actualizar el cierre") } finally { setBusy(false) }
  }

  const scheduledFor = impact?.scheduledClosure?.scheduledFor
  return <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
    <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" /><div><h2 className="font-semibold">Cerrar cuenta</h2><p className="text-sm text-muted-foreground">{scheduledFor ? `La cuenta está en sólo lectura hasta ${new Date(scheduledFor).toLocaleDateString("es-MX")}.` : "Programa el cierre definitivo después de 30 días de sólo lectura."}</p></div></div>
    {impact && !scheduledFor && <p className="text-sm text-muted-foreground">Se eliminarán {impact.cards} tarjetas y {impact.customers} clientes del negocio; el historial se anonimiza.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="button" variant="destructive" disabled={busy} onClick={() => void change(scheduledFor ? "cancel" : "schedule")}>
      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{scheduledFor ? "Cancelar cierre" : "Programar cierre"}
    </Button>
  </section>
}
