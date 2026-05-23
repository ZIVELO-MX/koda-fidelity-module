"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, QrCode } from "lucide-react"
import Link from "next/link"

interface CardActionsProps {
  cardId: string
}

export function CardActions({ cardId }: CardActionsProps) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm("¿Eliminar esta tarjeta? Los clientes perderán su progreso.")) return

    const res = await fetch(`/api/cards/${cardId}`, {
      method: "DELETE",
    })

    if (res.ok) {
      router.push("/dashboard/cards")
    }
  }

  return (
    <div className="flex gap-2">
      <Link href={`/dashboard/qr-codes`}>
        <Button variant="outline">
          <QrCode className="h-4 w-4 mr-2" />
          Código QR
        </Button>
      </Link>
      <Button variant="destructive" onClick={handleDelete}>
        <Trash2 className="h-4 w-4 mr-2" />
        Eliminar
      </Button>
    </div>
  )
}
