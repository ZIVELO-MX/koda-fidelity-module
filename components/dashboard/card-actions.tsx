"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, QrCode, Loader2 } from "lucide-react"
import Link from "next/link"

interface CardActionsProps {
  cardId: string
}

export function CardActions({ cardId }: CardActionsProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!confirm("¿Eliminar esta tarjeta? Los clientes perderán su progreso.")) return

    setDeleting(true)
    setError(null)

    const res = await fetch(`/api/cards/${cardId}`, {
      method: "DELETE",
    })

    if (res.ok) {
      router.push("/dashboard/cards")
    } else {
      setError("No fue posible eliminar la tarjeta")
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <Link href={`/dashboard/qr-codes`}>
          <Button variant="outline">
            <QrCode className="h-4 w-4 mr-2" />
            Código QR
          </Button>
        </Link>
        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
          {deleting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          Eliminar
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  )
}
