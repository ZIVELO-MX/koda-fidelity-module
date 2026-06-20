"use client"

import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { getCardIcon } from "@/lib/card-icons"
import { isLight } from "@/lib/color-utils"

interface CardQR {
  id: string
  name: string
  brandColor: string
  iconName?: string | null
}

export default function QRCodesPage() {
  const [cards, setCards] = useState<CardQR[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [baseUrl, setBaseUrl] = useState("")

  useEffect(() => {
    queueMicrotask(() => setBaseUrl(window.location.origin))
    fetch("/api/cards")
      .then((res) => res.json())
      .then((data) => queueMicrotask(() => setCards(data.cards || [])))
      .catch(() => queueMicrotask(() => setFetchError(true)))
      .finally(() => queueMicrotask(() => setLoading(false)))
  }, [])

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Códigos QR</h1>
        <p className="text-muted-foreground">Imprime o comparte códigos QR para que los clientes se unan a tus programas de lealtad</p>
      </div>

      {/* QR Codes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : fetchError ? (
        <div className="text-center py-20">
          <h3 className="text-lg font-semibold text-foreground mb-2">Error al cargar</h3>
          <p className="text-muted-foreground mb-6">No pudimos cargar tus tarjetas. Intenta de nuevo.</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-20">
          <h3 className="text-lg font-semibold text-foreground mb-2">No hay tarjetas</h3>
          <p className="text-muted-foreground mb-6">Crea una tarjeta de lealtad para generar su código QR</p>
          <Button asChild>
            <Link href="/dashboard/cards/new">Crear Tarjeta</Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const url = `${baseUrl}/join/${card.id}`
            return (
              <div
                key={card.id}
                className="bg-card rounded-2xl border border-border overflow-hidden transition-shadow hover:shadow-md"
              >
                <div className="h-2" style={{ backgroundColor: card.brandColor }} />
                
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    {(() => {
                      const icon = getCardIcon(card.iconName)
                      const IconComp = icon?.Icon
                      return (
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                          style={{ backgroundColor: card.brandColor }}
                        >
                          {IconComp ? <IconComp className="h-5 w-5" /> : card.name.charAt(0)}
                        </div>
                      )
                    })()}
                    <div>
                      <h3 className="font-semibold text-foreground">{card.name}</h3>
                    </div>
                  </div>

                  <div id={`qr-${card.id}`} className="bg-white rounded-2xl p-6 flex items-center justify-center mb-6 border border-border">
                    <QRCodeSVG
                      value={url}
                      size={180}
                      level="H"
                      fgColor={isLight(card.brandColor) ? "#1a1a1a" : card.brandColor}
                    />
                  </div>

                  <div className="bg-muted/50 rounded-xl p-3 mb-4">
                    <p className="text-xs text-muted-foreground mb-1">URL de destino</p>
                    <p className="text-sm text-foreground font-mono truncate">{url}</p>
                  </div>

                  <Link href={`/dashboard/qr-codes/${card.id}`}>
                    <Button variant="outline" className="w-full">Ver Detalles</Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Print Tips */}
      <div className="bg-muted/30 rounded-2xl p-6 border border-border">
        <h3 className="font-semibold text-foreground mb-2">Consejos de Impresión</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">1.</span>
            Descarga el código QR como PNG o SVG de alta resolución para mejor calidad de impresión
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">2.</span>
            Coloca los códigos QR en mostradores, mesas o entradas donde los clientes puedan escanear fácilmente
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">3.</span>
            Agrega un llamado a la acción como &quot;Escanea para unirte a nuestro programa de recompensas&quot; cerca del código QR
          </li>
        </ul>
      </div>
    </div>
  )
}
