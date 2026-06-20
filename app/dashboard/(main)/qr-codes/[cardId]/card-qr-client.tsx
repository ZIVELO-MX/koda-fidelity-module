"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Printer, Copy, ExternalLink, Check, FileDown, Eye, Loader2 } from "lucide-react"
import { getCardIcon } from "@/lib/card-icons"
import { isLight } from "@/lib/color-utils"
import { generateQRDataUrl, PDF_SIZES, type PdfSizeKey } from "@/lib/qr-pdf-utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const PDFDocument = dynamic(
  () => import("@/components/dashboard/qr-pdf-document").then((m) => m.QRPDFDocument),
  { ssr: false },
)

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
  const [showPreview, setShowPreview] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const joinUrl = baseUrl ? `${baseUrl}/join/${card.id}` : ""

  useEffect(() => {
    if (joinUrl) {
      generateQRDataUrl(joinUrl).then(setQrDataUrl)
    }
  }, [joinUrl])

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

  const downloadPDF = useCallback(async () => {
    if (!qrDataUrl) return
    setPdfLoading(true)
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const doc = (
        <PDFDocument card={card} businessName={businessName} businessLogo={businessLogo} qrDataUrl={qrDataUrl} size={pdfSize} />
      )
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `koda-${card.id}-qr.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }, [card, businessName, businessLogo, qrDataUrl, pdfSize])

  const printPDF = useCallback(async () => {
    if (!qrDataUrl) return
    setPdfLoading(true)
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const doc = (
        <PDFDocument card={card} businessName={businessName} businessLogo={businessLogo} qrDataUrl={qrDataUrl} size={pdfSize} />
      )
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
    } finally {
      setPdfLoading(false)
    }
  }, [card, businessName, businessLogo, qrDataUrl, pdfSize])

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
              <QRCodeSVG value={joinUrl} size={220} level="H" fgColor={isLight(card.brandColor) ? "#1a1a1a" : card.brandColor} />
            )}
          </div>
        </div>
      </div>

      <div className="bg-muted/40 rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">URL de destino</p>
        <p className="text-sm font-mono text-foreground break-all">{joinUrl || "—"}</p>
      </div>

      {/* PDF Size selector */}
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

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={downloadQR} className="w-full" disabled={!joinUrl}>
          <Download className="h-4 w-4 mr-2" />
          Descargar PNG
        </Button>
        <Button variant="outline" onClick={downloadPDF} className="w-full" disabled={!qrDataUrl || pdfLoading}>
          {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
          Descargar PDF
        </Button>
        <Button variant="outline" onClick={printPDF} className="w-full" disabled={!qrDataUrl || pdfLoading}>
          {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
          Imprimir
        </Button>
        <Button variant="outline" onClick={() => setShowPreview(true)} className="w-full" disabled={!qrDataUrl}>
          <Eye className="h-4 w-4 mr-2" />
          Vista Previa
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
            Join Flow
          </Button>
        </Link>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Coloca este código QR en tu negocio para que los clientes se unan al programa
      </p>

      {/* PDF Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Vista Previa — {PDF_SIZES[pdfSize].label}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {qrDataUrl && (
              <PDFPreviewInner
                card={card}
                businessName={businessName}
                businessLogo={businessLogo}
                qrDataUrl={qrDataUrl}
                size={pdfSize}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PDFPreviewInner(props: {
  card: CardData
  businessName: string
  businessLogo: string | null
  qrDataUrl: string
  size: PdfSizeKey
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function generate() {
      const { pdf } = await import("@react-pdf/renderer")
      const doc = <PDFDocument {...props} />
      const blob = await pdf(doc).toBlob()
      if (!cancelled) {
        setUrl(URL.createObjectURL(blob))
      }
    }
    generate()
    return () => { cancelled = true }
  }, [props.card, props.businessName, props.businessLogo, props.qrDataUrl, props.size])

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <iframe src={url} className="w-full h-full rounded-lg border border-border" title="Vista previa PDF" />
  )
}
