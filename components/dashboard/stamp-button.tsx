"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Stamp, Loader2, Check, Gift } from "lucide-react"

interface StampButtonProps {
  customerId: string
  currentStamps: number
  maxStamps: number
  reward: string
}

type StampState = "idle" | "loading" | "stamped" | "redeemed" | "error"

export function StampButton({
  customerId,
  currentStamps,
  maxStamps,
  reward,
}: StampButtonProps) {
  const [state, setState] = useState<StampState>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleStamp = useCallback(async () => {
    setState("loading")
    setErrorMsg(null)

    try {
      const type = currentStamps >= maxStamps ? "redeem" : "stamp"
      const res = await fetch("/api/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, type }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al procesar")
      }

      setState(data.event === "redeem" ? "redeemed" : "stamped")

      setTimeout(() => setState("idle"), 2000)
    } catch (err) {
      setState("error")
      setErrorMsg(err instanceof Error ? err.message : "Error al procesar")
      setTimeout(() => setState("idle"), 3000)
    }
  }, [customerId, currentStamps, maxStamps])

  if (state === "stamped") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
        <Check className="h-3.5 w-3.5" />
        Sellado
      </span>
    )
  }

  if (state === "redeemed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
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
        className="gap-1.5 h-8 px-2.5 text-xs"
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
      {state === "error" && errorMsg && (
        <span className="text-xs text-red-500">{errorMsg}</span>
      )}
    </div>
  )
}
