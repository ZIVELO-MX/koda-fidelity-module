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
import { ArrowLeft, Download, Printer, Copy, Check, ChevronDown, Loader2 } from "lucide-react"
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const joinUrl = baseUrl ? `${baseUrl}/join/${card.id}` : ""

  useEffect(() => {
    if (joinUrl) {
      generateQRDataUrl(joinUrl).then(setQrDataUrl)
    }
  }, [joinUrl])

  useEffect(() => {
    if (!qrDataUrl) return
    clearTimeout(previewTimerRef.current)
    const generate = async () => {
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
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(url)
      } finally {
        setLoading(false)
      }
    }
    previewTimerRef.current = setTimeout(generate, 200)
    return () => {
      clearTimeout(previewTimerRef.current)
    }
  }, [qrDataUrl, pdfSize, ctaText, card, businessName, businessLogo, previewUrl])

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

  const generatePDFBlob = useCallback(async () => {
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
    return pdf(doc).toBlob()
  }, [card, businessName, businessLogo, qrDataUrl, pdfSize, ctaText])

  const downloadPDF = useCallback(async () => {
    if (!qrDataUrl) return
    setLoading(true)
    try {
      const blob = await generatePDFBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `koda-${card.id}-qr.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }, [qrDataUrl, generatePDFBlob, card.id])

  const printPDF = useCallback(async () => {
    if (!qrDataUrl) return
    setLoading(true)
    try {
      const blob = await generatePDFBlob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
    } finally {
      setLoading(false)
    }
  }, [qrDataUrl, generatePDFBlob])

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

      {/* Live preview */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">Vista previa</p>
          {loading && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Actualizando…
            </span>
          )}
        </div>
        <div
          className="bg-card rounded-2xl border border-border overflow-hidden"
          style={{
            height: pdfSize === "carta" ? 480 : pdfSize === "media-carta" ? 400 : 340,
          }}
        >
          {previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full"
              title="Vista previa del PDF"
              style={{ pointerEvents: "none" }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                "Selecciona un tamaño para ver la vista previa"
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="w-full gap-1" disabled={!qrDataUrl}>
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
            <DropdownMenuItem onClick={downloadPDF} disabled={!qrDataUrl || loading}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" onClick={printPDF} className="w-full gap-2" disabled={!qrDataUrl || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Imprimir
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
