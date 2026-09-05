"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Gift, Loader2, Stamp } from "lucide-react"

interface MilestoneClaim {
  id: string
  label: string
  iconName: string | null
}

interface CustomerRowActionProps {
  customerId: string
  currentStamps: number
  maxStamps: number
}

type Estado = "idle" | "loading" | "hecho" | "error"

/**
 * Sellar o canjear desde la propia fila. Antes vivía detrás del menú de tres
 * puntos, que escondía la acción que más se usa detrás de dos toques.
 */
export function CustomerRowAction({ customerId, currentStamps, maxStamps }: CustomerRowActionProps) {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>("idle")
  const [bono, setBono] = useState<MilestoneClaim | null>(null)

  const completa = currentStamps >= maxStamps

  const ejecutar = useCallback(async () => {
    setEstado("loading")
    setBono(null)
    try {
      const res = await fetch("/api/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, type: completa ? "redeem" : "stamp" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      setEstado("hecho")
      if (data.milestoneClaim) setBono(data.milestoneClaim)
      router.refresh()
      setTimeout(() => setEstado("idle"), 2000)
    } catch {
      setEstado("error")
      setTimeout(() => setEstado("idle"), 3000)
    }
  }, [customerId, completa, router])

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        onClick={ejecutar}
        disabled={estado === "loading"}
        size="sm"
        variant={completa ? "default" : "outline"}
        className={completa ? "min-h-10 bg-green-600 text-white hover:bg-green-700" : "min-h-10"}
      >
        {estado === "loading" ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : completa ? (
          <Gift className="h-4 w-4 mr-2" />
        ) : (
          <Stamp className="h-4 w-4 mr-2" />
        )}
        {completa ? "Canjear" : "Sellar"}
      </Button>

      {estado === "error" && (
        <p role="alert" className="text-xs text-red-600">
          No se pudo registrar. Intenta de nuevo.
        </p>
      )}

      {/* El bono se anuncia aquí mismo. Un diálogo obligaba a despacharlo antes
          de seguir atendiendo la fila. */}
      {bono && (
        <p role="status" className="anuncio-entra text-xs font-medium text-amber-700 dark:text-amber-400">
          Bono sorpresa: {bono.label}
        </p>
      )}
    </div>
  )
}
