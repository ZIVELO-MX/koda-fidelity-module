"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"

export function AccountClosurePanel() {
  const [scheduled, setScheduled] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void fetch("/api/account/deletion-impact", { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(impact => {
        if (!controller.signal.aborted) setScheduled(Boolean(impact?.scheduledClosure))
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  return (
    <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 text-destructive" />
        <div>
          <h2 className="font-semibold">Cerrar cuenta</h2>
          <p className="text-sm text-muted-foreground">
            {scheduled
              ? "La cuenta está en solo lectura. Contacta a soporte para consultar el plazo o solicitar la cancelación del cierre."
              : "Contacta a soporte para solicitar el cierre de la cuenta. Si se programa, tienes 30 días para solicitar la cancelación."}
          </p>
        </div>
      </div>
    </section>
  )
}
