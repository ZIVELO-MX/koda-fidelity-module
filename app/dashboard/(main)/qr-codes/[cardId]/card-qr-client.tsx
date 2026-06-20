"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, Download, FileText, Copy, Check, ChevronDown, Loader2 } from "lucide-react"
import { getCardIcon } from "@/lib/card-icons"
import { isLight } from "@/lib/color-utils"
import { generateQRDataUrl, PDF_SIZES, CTA_TEMPLATES, DEFAULT_CTA_INDEX, type PdfSizeKey } from "@/lib/qr-pdf-utils"

interface CardData {
  id: string
  name: string
  reward: string
  stampsRequired: number
  brandColor: string
  iconName: string | null
}

const PREVIEW_MAX_W = 520
const PREVIEW_MAX_H = 520

export function CardQRClient({
  card,
  businessName,
  businessLogo,
}: {
  card: CardData
  businessName: string
  businessLogo: string | null
}) {
  const [baseUrl, setBaseUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [pdfSize, setPdfSize] = useState<PdfSizeKey>("carta")
  const [ctaText, setCtaText] = useState(CTA_TEMPLATES[DEFAULT_CTA_INDEX](businessName))
  const [loading, setLoading] = useState(false)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const joinUrl = baseUrl ? `${baseUrl}/join/${card.id}` : ""

  useEffect(() => {
    if (joinUrl) {
      generateQRDataUrl(joinUrl).then(setQrDataUrl)
    }
  }, [joinUrl])

  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current
    if (!canvas || !qrDataUrl) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width: pw, height: ph } = PDF_SIZES[pdfSize]
    const scale = Math.min(PREVIEW_MAX_W / pw, PREVIEW_MAX_H / ph, 1)
    const cw = Math.round(pw * scale)
    const ch = Math.round(ph * scale)

    canvas.width = cw
    canvas.height = ch
    canvas.style.width = `${cw}px`
    canvas.style.height = `${ch}px`

    ctx.clearRect(0, 0, cw, ch)

    // White background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, cw, ch)

    // Brand bar
    const barH = Math.round(8 * scale)
    ctx.fillStyle = card.brandColor
    ctx.fillRect(0, 0, cw, barH)

    const pad = Math.round(scale * (pdfSize === "carta" ? 40 : pdfSize === "media-carta" ? 30 : 20))
    let y = pad

    // Business name
    if (pdfSize !== "tarjeta") {
      ctx.fillStyle = "#1a1a1a"
      ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`
      ctx.textAlign = "center"
      ctx.fillText(businessName, cw / 2, y)
      y += Math.round(18 * scale) + Math.round(12 * scale)
    }

    // QR code
    const qrSize = Math.round(scale * (pdfSize === "carta" ? 220 : pdfSize === "media-carta" ? 180 : 150))
    const qrX = (cw - qrSize) / 2

    const svg = document.getElementById("card-qr-svg")?.querySelector("svg")
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg)
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, qrX, y, qrSize, qrSize)
      }
      img.src = `data:image/svg+xml;base64,${btoa(svgData)}`
    }

    y += qrSize + Math.round(10 * scale)

    // CTA text
    const ctaSize = Math.round(scale * (pdfSize === "carta" ? 15 : pdfSize === "media-carta" ? 13 : 10))
    ctx.fillStyle = card.brandColor
    ctx.font = `bold ${ctaSize}px sans-serif`
    ctx.textAlign = "center"
    wrapText(ctx, ctaText, cw / 2, y, cw - pad * 2, ctaSize + 2)
    y += measureWrappedText(ctx, ctaText, cw - pad * 2, ctaSize + 2) + Math.round(8 * scale)

    // Card name
    const titleSize = Math.round(scale * (pdfSize === "carta" ? 18 : pdfSize === "media-carta" ? 16 : 13))
    ctx.fillStyle = "#1a1a1a"
    ctx.font = `bold ${titleSize}px sans-serif`
    ctx.textAlign = "center"
    ctx.fillText(card.name, cw / 2, y)
    y += titleSize + 2

    // Reward
    const rewardSize = Math.round(scale * 12)
    ctx.fillStyle = "#374151"
    ctx.font = `${rewardSize}px sans-serif`
    ctx.fillText(`${card.stampsRequired} sellos · Recompensa: ${card.reward}`, cw / 2, y)
    y += Math.round(14 * scale)

    // Footer
    if (ch - y > Math.round(20 * scale)) {
      y = ch - Math.round(14 * scale)
      ctx.fillStyle = "#e5e7eb"
      ctx.fillRect(pad, y - Math.round(6 * scale), cw - pad * 2, 1)
      ctx.fillStyle = "#9ca3af"
      ctx.font = `${Math.round(8 * scale)}px sans-serif`
      ctx.textAlign = "center"
      ctx.fillText("Con tecnología de Koda Fidelity", cw / 2, y + Math.round(4 * scale))
    }
  }, [qrDataUrl, pdfSize, ctaText, card, businessName, businessLogo])

  useEffect(() => {
    if (qrDataUrl) {
      drawPreview()
    }
  }, [qrDataUrl, drawPreview])

  const copyUrl = useCallback(async () => {
    if (!joinUrl) return
    await navigator.clipboard.writeText(joinUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [joinUrl])

  const downloadPNG = useCallback(() => {
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

  const generateAndOpenPDF = useCallback(async () => {
    if (!qrDataUrl) return
    setLoading(true)
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const { QRPDFDocument } = await import("@/components/dashboard/qr-pdf-document")
      const doc = (
        <QRPDFDocument
          card={card}
          businessName={businessName}
          businessLogo={businessLogo}
          qrDataUrl={qrDataUrl}
          size={pdfSize}
          ctaText={ctaText}
        />
      )
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
    } finally {
      setLoading(false)
    }
  }, [card, businessName, businessLogo, qrDataUrl, pdfSize, ctaText])

  const handleCTAPreset = useCallback(
    (index: number) => {
      setCtaText(CTA_TEMPLATES[index](businessName))
    },
    [businessName],
  )

  const icon = getCardIcon(card.iconName)
  const IconComp = icon?.Icon

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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

      {/* QR Code */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-2" style={{ backgroundColor: card.brandColor }} />
        <div className="p-8">
          <div
            id="card-qr-svg"
            className="bg-white rounded-2xl p-6 flex items-center justify-center border border-border"
          >
            {joinUrl && (
              <QRCodeSVG value={joinUrl} size={220} level="H" fgColor={isLight(card.brandColor) ? "#1a1a1a" : card.brandColor} />
            )}
          </div>
        </div>
      </div>

      {/* Size selector */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Tamaño de impresión</p>
        <div className="flex gap-2">
          {(Object.entries(PDF_SIZES) as [PdfSizeKey, typeof PDF_SIZES[PdfSizeKey]][]).map(([key, { label }]) => (
            <Button
              key={key}
              variant={pdfSize === key ? "default" : "outline"}
              size="sm"
              onClick={() => setPdfSize(key)}
              className="flex-1"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* CTA text */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Mensaje promocional</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            placeholder="Escribe un mensaje..."
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 gap-1">
                Recomendados <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {CTA_TEMPLATES.map((tmpl, i) => (
                <DropdownMenuItem key={i} onClick={() => handleCTAPreset(i)}>
                  {tmpl(businessName)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* PNG Preview */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Vista previa</p>
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-center min-h-[200px]">
          {qrDataUrl ? (
            <canvas ref={previewCanvasRef} className="max-w-full rounded shadow-sm" />
          ) : (
            <span className="text-sm text-muted-foreground">Generando vista previa…</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="w-full gap-1" disabled={!joinUrl}>
              <Download className="h-4 w-4" />
              Descargar
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={downloadPNG} disabled={!joinUrl}>
              <Download className="h-4 w-4 mr-2" />
              PNG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" onClick={generateAndOpenPDF} className="w-full gap-2" disabled={!qrDataUrl || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          PDF
        </Button>

        <Button variant="outline" onClick={copyUrl} className="w-full gap-2" disabled={!joinUrl}>
          {copied ? (
            <><Check className="h-4 w-4" />Copiado</>
          ) : (
            <><Copy className="h-4 w-4" />Copiar URL</>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Coloca este código QR en tu negocio para que los clientes se unan al programa
      </p>
    </div>
  )
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ")
  let line = ""
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y)
      line = word
      y += lineHeight
    } else {
      line = testLine
    }
  }
  if (line) {
    ctx.fillText(line, x, y)
  }
}

function measureWrappedText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number): number {
  const words = text.split(" ")
  let line = ""
  let lines = 1
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      line = word
      lines++
    } else {
      line = testLine
    }
  }
  return lines * lineHeight
}
