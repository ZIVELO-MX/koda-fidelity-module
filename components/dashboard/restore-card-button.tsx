"use client"

import { submitCardChange } from "@/lib/submit-card-change"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArchiveRestore, Loader2 } from "lucide-react"

interface RestoreCardButtonProps {
  cardId: string
  cardName: string
}

export function RestoreCardButton({ cardId, cardName }: RestoreCardButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRestore = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await submitCardChange(`/api/cards/${cardId}/restore`, { method: "POST" })
      if (!res) return
      if (res.ok) {
        router.refresh()
      } else {
        const body = await res.json().catch(() => null)
        setError(body?.error || "No fue posible restaurar la tarjeta")
      }
    } catch {
      setError("No fue posible conectar con el servidor")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full"
        onClick={handleRestore}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <ArchiveRestore className="h-4 w-4 mr-2" />
        )}
        Restaurar tarjeta
      </Button>
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  )
}
