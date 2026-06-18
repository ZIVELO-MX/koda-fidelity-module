"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Printer, Copy, ExternalLink, Check } from "lucide-react"
import { getCardIcon } from "@/lib/card-icons"

interface CardData {
  id: string
  name: string
  reward: string
  stampsRequired: number
  brandColor: string
  iconName: string | null
}

export function CardQRClient({ card, businessLogo }: { card: CardData; businessLogo: string | null }) {
  const [baseUrl, setBaseUrl] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const joinUrl = baseUrl ? `${baseUrl}/join/${card.id}` : ""

  const copyUrl = useCallback(async () => {
    if (!joinUrl) return
    await navigator.clipboard.writeText(joinUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [joinUrl])

  const downloadQR = useCallback(() => {
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

  const icon = getCardIcon(card.iconName)
  const IconComp = icon?.Icon

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Link
        href={`/dashboard/cards/${card.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a la tarjeta
      </Link>

      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
          style={{ backgroundColor: card.brandColor }}
        >
          {card.iconName === "logo" && businessLogo ? (
            <img src={businessLogo} alt="" className="w-7 h-7 object-contain" />
          ) : IconComp ? (
            <IconComp className="h-5 w-5" />
          ) : (
            card.name.charAt(0)
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{card.name}</h1>
          <p className="text-sm text-muted-foreground">{card.stampsRequired} sellos · {card.reward}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-2" style={{ backgroundColor: card.brandColor }} />
        <div className="p-8">
          <div
            id="card-qr-svg"
            className="bg-white rounded-2xl p-6 flex items-center justify-center border border-border"
          >
            {joinUrl && (
              <QRCodeSVG value={joinUrl} size={220} level="H" fgColor={card.brandColor} />
            )}
          </div>
        </div>
      </div>

      <div className="bg-muted/40 rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">URL de destino</p>
        <p className="text-sm font-mono text-foreground break-all">{joinUrl || "—"}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={downloadQR} className="w-full" disabled={!joinUrl}>
          <Download className="h-4 w-4 mr-2" />
          Descargar PNG
        </Button>
        <Button variant="outline" onClick={() => window.print()} className="w-full">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
        <Button variant="outline" onClick={copyUrl} className="w-full" disabled={!joinUrl}>
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

      <p className="text-xs text-muted-foreground text-center">
        Coloca este código QR en tu negocio para que los clientes se unan al programa
      </p>
    </div>
  )
}
