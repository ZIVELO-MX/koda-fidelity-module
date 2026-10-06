"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { acknowledgePlanChangeNotice } from "@/lib/actions/plan-change-notice"
import type { AccountPlan } from "@/lib/plan-change-notice"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const planLabel = (plan: AccountPlan) => plan === "PRO" ? "Pro" : "Lite"

export function AccountPlanChangeNotice({
  notice,
}: {
  notice: { eventId: string; from: AccountPlan; to: AccountPlan } | null
}) {
  const [acknowledgedEventId, setAcknowledgedEventId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setError(false)
    setAcknowledgedEventId(null)
  }, [notice?.eventId])

  async function dismiss() {
    setSaving(true)
    try {
      if (notice && await acknowledgePlanChangeNotice(notice.eventId)) {
        setAcknowledgedEventId(notice.eventId)
        setOpen(false)
      }
      else setError(true)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  const visible = Boolean(notice && acknowledgedEventId !== notice.eventId)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={visible ? "Notificaciones, 1 sin leer" : "Notificaciones"}
          className="relative h-11 w-11"
        >
          <Bell aria-hidden="true" className="h-5 w-5" />
          {visible ? <span aria-hidden="true" className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" /> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-80">
        {visible && notice ? (
          <section role="status" aria-live="polite" className="space-y-3">
            <p className="text-sm">
              El plan de tu cuenta cambió de <strong>{planLabel(notice.from)}</strong> a <strong>{planLabel(notice.to)}</strong>.
            </p>
            {error ? <p role="alert" className="text-xs text-destructive">No se pudo guardar el aviso. Inténtalo de nuevo.</p> : null}
            <Button type="button" onClick={() => void dismiss()} disabled={saving} className="w-full">
              {saving ? "Guardando…" : "Entendido"}
            </Button>
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">No tienes notificaciones por ahora.</p>
        )}
      </PopoverContent>
    </Popover>
  )
}
