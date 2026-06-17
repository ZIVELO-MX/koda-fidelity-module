"use client"

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
    const res = await fetch(`/api/cards/${cardId}/restore`, { method: "POST" })
    if (res.ok) {
      router.refresh()
    } else {
      setError("No fue posible restaurar la tarjeta")
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
