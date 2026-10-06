"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ejecutarSellado } from "@/lib/sellado"
import { Button } from "@/components/ui/button"
import { Stamp, Loader2, Check, Gift } from "lucide-react"
import { derivarMarca } from "@/lib/color-marca"

interface StampButtonProps {
  customerId: string
  currentStamps: number
  maxStamps: number
  reward: string
  brandColor?: string
}

type StampState = "idle" | "loading" | "stamped" | "redeemed"

export function StampButton({
  customerId,
  currentStamps,
  maxStamps,
  reward,
  brandColor,
}: StampButtonProps) {
  const router = useRouter()
  const [state, setState] = useState<StampState>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleStamp = useCallback(async () => {
    setState("loading")
    setErrorMsg(null)

    try {
      const type = currentStamps >= maxStamps ? "redeem" : "stamp"
      const data = await ejecutarSellado(customerId, type)

      setState(data.event === "redeem" ? "redeemed" : "stamped")
      router.refresh()

      setTimeout(() => setState("idle"), 2000)
    } catch (err) {
      // El error se queda hasta el siguiente intento: antes se borraba a los 3 s
      // y en el mostrador era fácil no verlo.
      setState("idle")
      setErrorMsg(err instanceof Error ? err.message : "Error al procesar")
    }
  }, [customerId, currentStamps, maxStamps, router])

  if (state === "stamped") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
        <Check className="h-3.5 w-3.5" />
        Sellado
      </span>
    )
  }

  if (state === "redeemed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
        <Gift className="h-3.5 w-3.5" />
        {reward} canjeado
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleStamp}
        disabled={state === "loading"}
        // En pantalla táctil el blanco crece a 44 px; con ratón se queda compacto.
        className="gap-1.5 h-8 pointer-coarse:h-11 px-2.5 text-xs"
        style={brandColor ? { color: derivarMarca(brandColor).ink } : undefined}
      >
        {state === "loading" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : currentStamps >= maxStamps ? (
          <Gift className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Stamp className="h-3.5 w-3.5" />
        )}
        {currentStamps >= maxStamps ? "Canjear" : "Sellar"}
      </Button>
      {errorMsg && (
        <span role="alert" className="text-xs text-red-600">{errorMsg}</span>
      )}
    </div>
  )
}
