"use client"

import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

interface CardQRInlineProps {
  cardId: string
  brandColor: string
}

export function CardQRInline({ cardId, brandColor }: CardQRInlineProps) {
  const [joinUrl, setJoinUrl] = useState("")

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join/${cardId}`)
  }, [cardId])

  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
      <div className="bg-white rounded-lg p-2 border border-border shrink-0">
        {joinUrl ? (
          <QRCodeSVG value={joinUrl} size={80} level="H" fgColor={brandColor} />
        ) : (
          <div className="w-20 h-20 bg-muted/30 rounded animate-pulse" />
        )}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-sm text-foreground">Código QR</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">
          Comparte este código para que los clientes se unan
        </p>
        <Link
          href={`/dashboard/qr-codes/${cardId}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Ver, descargar e imprimir
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
