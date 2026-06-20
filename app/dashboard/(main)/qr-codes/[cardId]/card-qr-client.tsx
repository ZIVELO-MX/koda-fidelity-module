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
import { ArrowLeft, Download, FileText, Copy, Check, ChevronDown, Loader2, QrCode } from "lucide-react"
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

const PREVIEW_MAX_W = 440
const PREVIEW_MAX_H = 560

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
  const [pdfSize, setPdfSize] = useState<PdfSizeKey>("tarjeta")
  const [ctaText, setCtaText] = useState(CTA_TEMPLATES[DEFAULT_CTA_INDEX](businessName))
  const [loading, setLoading] = useState(false)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const qrImageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const joinUrl = baseUrl ? `${baseUrl}/join/${card.id}` : ""

  useEffect(() => {
    if (joinUrl) {
      generateQRDataUrl(joinUrl).then(setQrDataUrl)
    }
  }, [joinUrl])

  // Preload QR image for preview drawing
  useEffect(() => {
    if (!qrDataUrl) return
    const img = new Image()
    img.src = qrDataUrl
    qrImageRef.current = img
  }, [qrDataUrl])

  const drawLayout = useCallback((
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    qrImg: HTMLImageElement,
  ) => {
    const { width: pw, height: ph } = PDF_SIZES[pdfSize]
    const scale = cw / pw

    ctx.clearRect(0, 0, cw, ch)

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, cw, ch)

    const barH = Math.max(1, Math.round(8 * scale))
    ctx.fillStyle = card.brandColor
    ctx.fillRect(0, 0, cw, barH)

    const pad = Math.round(scale * (pdfSize === "carta" ? 36 : pdfSize === "media-carta" ? 28 : 18))
    let y = pad + barH

    if (pdfSize !== "tarjeta") {
      ctx.fillStyle = "#1a1a1a"
      ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`
      ctx.textAlign = "center"
      ctx.fillText(businessName, cw / 2, y)
      y += Math.round(18 * scale)
    }

    y += Math.round(8 * scale)

    const qrSize = Math.round(scale * (pdfSize === "carta" ? 220 : pdfSize === "media-carta" ? 180 : 150))
    const qrX = (cw - qrSize) / 2
    ctx.drawImage(qrImg, qrX, y, qrSize, qrSize)

    y += qrSize + Math.round(12 * scale)

    const ctaSize = Math.round(scale * (pdfSize === "carta" ? 14 : pdfSize === "media-carta" ? 12 : 10))
    ctx.fillStyle = card.brandColor
    ctx.font = `bold ${ctaSize}px sans-serif`
    ctx.textAlign = "center"
    const ctaLines = wrapText(ctx, ctaText, cw / 2, y, cw - pad * 2, ctaSize + 3)
    y += ctaLines * (ctaSize + 3) + Math.round(6 * scale)

    const titleSize = Math.round(scale * (pdfSize === "carta" ? 16 : pdfSize === "media-carta" ? 14 : 11))
    ctx.fillStyle = "#1a1a1a"
    ctx.font = `bold ${titleSize}px sans-serif`
    ctx.textAlign = "center"
    ctx.fillText(card.name, cw / 2, y)
    y += titleSize + Math.round(4 * scale)

    const rewardSize = Math.round(scale * 11)
    ctx.fillStyle = "#374151"
    ctx.font = `${rewardSize}px sans-serif`
    ctx.textAlign = "center"
    ctx.fillText(`${card.stampsRequired} sellos · Recompensa: ${card.reward}`, cw / 2, y)

    const remaining = ch - y
    if (remaining > Math.round(20 * scale)) {
      const fy = ch - Math.round(12 * scale)
      ctx.fillStyle = "#e5e7eb"
      ctx.fillRect(pad, fy - Math.round(6 * scale), cw - pad * 2, 1)
      ctx.fillStyle = "#9ca3af"
      ctx.font = `${Math.round(7 * scale)}px sans-serif`
      ctx.textAlign = "center"
      ctx.fillText("Con tecnología de Koda Fidelity", cw / 2, fy + Math.round(3 * scale))
    }
  }, [pdfSize, ctaText, card, businessName])

  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current
    const qrImg = qrImageRef.current
    if (!canvas || !qrImg || !qrImg.complete) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width: pw, height: ph } = PDF_SIZES[pdfSize]
    const scale = Math.min(PREVIEW_MAX_W / pw, PREVIEW_MAX_H / ph, 0.8)
    const cw = Math.round(pw * scale)
    const ch = Math.round(ph * scale)

    canvas.width = cw
    canvas.height = ch
    canvas.style.width = `${cw}px`
    canvas.style.height = `${ch}px`

    drawLayout(ctx, cw, ch, qrImg)
  }, [qrDataUrl, pdfSize, drawLayout])

  useEffect(() => {
    if (qrImageRef.current?.complete) {
      drawPreview()
    } else if (qrImageRef.current) {
      qrImageRef.current.onload = drawPreview
    }
  }, [drawPreview, qrDataUrl])

  const copyUrl = useCallback(async () => {
    if (!joinUrl) return
    await navigator.clipboard.writeText(joinUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [joinUrl])

  const downloadPNG = useCallback(async () => {
    let qrImg = qrImageRef.current
    if (!qrImg || !qrImg.complete) {
      qrImg = new Image()
      qrImg.src = qrDataUrl
      await new Promise<void>((resolve, reject) => {
        qrImg!.onload = () => resolve()
        qrImg!.onerror = reject
      })
    }

    const { width: pw, height: ph } = PDF_SIZES[pdfSize]
    const exportScale = 2
    const cw = Math.round(pw * exportScale)
    const ch = Math.round(ph * exportScale)

    const canvas = document.createElement("canvas")
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    drawLayout(ctx, cw, ch, qrImg)

    const link = document.createElement("a")
    link.download = `koda-${card.id}-qr.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [card, pdfSize, drawLayout])

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

  const downloadQRPNG = useCallback(() => {
    if (!qrDataUrl) return
    const link = document.createElement("a")
    link.download = `koda-${card.id}-qr-code.png`
    link.href = qrDataUrl
    link.click()
  }, [qrDataUrl, card.id])

  const downloadQRSVG = useCallback(() => {
    const svgEl = document.querySelector("#card-qr-svg svg")
    if (!svgEl) return
    const clone = svgEl.cloneNode(true) as SVGElement
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
    const svgData = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
    const link = document.createElement("a")
    link.download = `koda-${card.id}-qr-code.svg`
    link.href = URL.createObjectURL(blob)
    link.click()
  }, [card.id])

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

      {/* Preview */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Vista previa</p>
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-center min-h-[160px] overflow-auto">
          {qrDataUrl ? (
            <canvas ref={previewCanvasRef} className="rounded shadow-sm shrink-0" />
          ) : (
            <span className="text-sm text-muted-foreground">Generando vista previa…</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button variant="default" onClick={downloadPNG} className="w-full gap-2" disabled={!joinUrl}>
          <Download className="h-4 w-4" />
          PNG
        </Button>

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

      {/* QR-only downloads */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-xs text-muted-foreground">Solo QR:</span>
        <Button variant="ghost" size="sm" onClick={downloadQRPNG} disabled={!qrDataUrl} className="gap-1.5 text-xs h-7">
          <Download className="h-3 w-3" />
          PNG
        </Button>
        <Button variant="ghost" size="sm" onClick={downloadQRSVG} disabled={!joinUrl} className="gap-1.5 text-xs h-7">
          <QrCode className="h-3 w-3" />
          SVG
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Coloca este código QR en tu negocio para que los clientes se unan al programa
      </p>
    </div>
  )
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(" ")
  let line = ""
  let lines = 0
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y)
      line = word
      y += lineHeight
      lines++
    } else {
      line = testLine
    }
  }
  if (line) {
    ctx.fillText(line, x, y)
    lines++
  }
  return lines
}
