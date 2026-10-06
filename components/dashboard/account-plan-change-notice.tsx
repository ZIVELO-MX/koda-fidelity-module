"use client"

import { useState } from "react"
import { acknowledgePlanChangeNotice } from "@/lib/actions/plan-change-notice"
import type { AccountPlan } from "@/lib/plan-change-notice"

const planLabel = (plan: AccountPlan) => plan === "PRO" ? "Pro" : "Lite"

export function AccountPlanChangeNotice({
  eventId,
  from,
  to,
}: {
  eventId: string
  from: AccountPlan
  to: AccountPlan
}) {
  const [visible, setVisible] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  if (!visible) return null

  async function dismiss() {
    setSaving(true)
    try {
      if (await acknowledgePlanChangeNotice(eventId)) setVisible(false)
      else setError(true)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      role="status"
      aria-live="polite"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground"
    >
      <p className="min-w-0">
        El plan de tu cuenta cambió de <strong>{planLabel(from)}</strong> a <strong>{planLabel(to)}</strong>.
        {error ? <span role="alert" className="mt-1 block text-xs text-destructive">No se pudo guardar el aviso. Inténtalo de nuevo.</span> : null}
      </p>
      <button
        type="button"
        onClick={() => void dismiss()}
        disabled={saving}
        className="min-h-10 shrink-0 rounded-lg px-3 font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Entendido"}
      </button>
    </section>
  )
}
