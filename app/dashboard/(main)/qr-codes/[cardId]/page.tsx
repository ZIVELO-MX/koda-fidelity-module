"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Printer, Copy, ExternalLink, Check, Loader2 } from "lucide-react"
import { getCardIcon } from "@/lib/card-icons"

interface CardDetail {
  id: string
  name: string
  brandColor: string
  iconName: string | null
  reward: string
  stampsRequired: number
}

export default function CardQRPage() {
  const { cardId } = useParams<{ cardId: string }>()
  const [card, setCard] = useState<CardDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [baseUrl, setBaseUrl] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setBaseUrl(window.location.origin)
    fetch(`/api/cards/${cardId}`)
      .then((r) => r.json())
      .then((d) => setCard(d.card ?? null))
      .catch(() => setCard(null))
      .finally(() => setLoading(false))
  }, [cardId])

  const url = card ? `${baseUrl}/join/${card.id}` : ""

  const copyUrl = useCallback(async () => {
    if (!url) return
    await navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [url])

  const downloadQR = useCallback(() => {
    if (!card) return
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = 400
    canvas.height = 500
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, 400, 500)
    ctx.fillStyle = card.brandColor
    ctx.fillRect(0, 0, 400, 8)
    ctx.fillStyle = "#000000"
    ctx.font = "bold 20px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(card.name, 200, 50)

    const svg = document.getElementById("card-qr-svg")?.querySelector("svg")
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg)
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 100, 70, 200, 200)
        const link = document.createElement("a")
        link.download = `koda-${card.id}-qr.png`
        link.href = canvas.toDataURL("image/png")
        link.click()
      }
      img.src = `data:image/svg+xml;base64,${btoa(svgData)}`
    }
  }, [card])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!card) {
    return (
      <div className="text-center py-40 space-y-4">
        <p className="text-lg font-semibold text-foreground">Tarjeta no encontrada</p>
        <Link href="/dashboard/qr-codes">
          <Button variant="outline">Ver todos los códigos QR</Button>
        </Link>
      </div>
    )
  }

  const icon = getCardIcon(card.iconName)
  const IconComp = icon?.Icon

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/dashboard/cards/${card.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a la tarjeta
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
          style={{ backgroundColor: card.brandColor }}
        >
          {IconComp ? <IconComp className="h-5 w-5" /> : card.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{card.name}</h1>
          <p className="text-sm text-muted-foreground">{card.stampsRequired} sellos · {card.reward}</p>
        </div>
      </div>

      {/* QR */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-2" style={{ backgroundColor: card.brandColor }} />
        <div className="p-8">
          <div
            id="card-qr-svg"
            className="bg-white rounded-2xl p-6 flex items-center justify-center border border-border"
          >
            <QRCodeSVG
              value={url}
              size={220}
              level="H"
              fgColor={card.brandColor}
            />
          </div>
        </div>
      </div>

      {/* URL */}
      <div className="bg-muted/40 rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">URL de destino</p>
        <p className="text-sm font-mono text-foreground break-all">{url}</p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={downloadQR} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Descargar PNG
        </Button>
        <Button variant="outline" onClick={() => window.print()} className="w-full">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
        <Button variant="outline" onClick={copyUrl} className="w-full">
          {copied ? (
            <><Check className="h-4 w-4 mr-2" />¡Copiado!</>
          ) : (
            <><Copy className="h-4 w-4 mr-2" />Copiar URL</>
          )}
        </Button>
        <Link href={`/join/${card.id}`} className="w-full">
          <Button variant="outline" className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Vista Previa
          </Button>
        </Link>
      </div>

      {/* Print tip */}
      <p className="text-xs text-muted-foreground text-center">
        Coloca este código QR en tu negocio para que los clientes se unan al programa
      </p>
    </div>
  )
}
