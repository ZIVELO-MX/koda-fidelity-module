"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import NextImage from "next/image"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, Download, FileText, Copy, Check, ChevronDown, Loader2, QrCode, ExternalLink } from "lucide-react"
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
  const [copyMessage, setCopyMessage] = useState("")
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [pdfSize, setPdfSize] = useState<PdfSizeKey>("tarjeta")
  const [ctaText, setCtaText] = useState(CTA_TEMPLATES[DEFAULT_CTA_INDEX](businessName))
  const [loading, setLoading] = useState(false)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const qrImageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    queueMicrotask(() => setBaseUrl(window.location.origin))
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
  }, [pdfSize, drawLayout])

  useEffect(() => {
    if (qrImageRef.current?.complete) {
      drawPreview()
    } else if (qrImageRef.current) {
      qrImageRef.current.onload = drawPreview
    }
  }, [drawPreview, qrDataUrl])

  const copyUrl = useCallback(async () => {
    if (!joinUrl) return
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setCopyMessage("Link de registro copiado.")
      setTimeout(() => {
        setCopied(false)
        setCopyMessage("")
      }, 2000)
    } catch {
      setCopyMessage("No se pudo copiar el link. Selecciona la URL manualmente.")
    }
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
  }, [card, pdfSize, drawLayout, qrDataUrl])

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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit gap-2 text-muted-foreground">
            <Link href={`/dashboard/cards/${card.id}`}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver a la Tarjeta
            </Link>
          </Button>

          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
              style={{ backgroundColor: card.brandColor }}
            >
              {card.iconName === "logo" && businessLogo ? (
                <NextImage src={businessLogo} alt="" width={32} height={32} className="h-8 w-8 object-contain" />
              ) : IconComp ? (
                <IconComp className="h-5 w-5" aria-hidden="true" />
              ) : (
                card.name.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Link de Registro</p>
              <h1 className="truncate text-2xl font-bold text-foreground text-balance">{card.name}</h1>
            </div>
          </div>
        </div>

        <Button asChild variant="outline" className="w-full gap-2 sm:w-auto">
          <Link href={`/dashboard/qr-codes/${card.id}/preview`}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Abrir Vista de Registro
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="h-2" style={{ backgroundColor: card.brandColor }} />
          <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[18rem_minmax(0,1fr)] md:items-center">
            <div
              id="card-qr-svg"
              className="mx-auto flex aspect-square w-full max-w-72 items-center justify-center rounded-xl border border-border bg-white p-6"
            >
              {joinUrl && (
                <QRCodeSVG
                  value={joinUrl}
                  size={220}
                  level="H"
                  title={`Código QR para registrarse en ${card.name}`}
                  fgColor={isLight(card.brandColor) ? "#1a1a1a" : card.brandColor}
                />
              )}
            </div>

            <div className="min-w-0 space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground text-balance">
                  Comparte este QR para registrar clientes
                </h2>
                <p className="text-sm text-muted-foreground text-pretty">
                  El link lleva a la página pública donde tus clientes pueden unirse a esta tarjeta de lealtad.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">URL de destino</p>
                <p className="break-words font-mono text-sm text-foreground" translate="no">
                  {joinUrl || "Generando link…"}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="default" onClick={copyUrl} className="w-full gap-2" disabled={!joinUrl}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Link Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      Copiar Link
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={downloadQRPNG} disabled={!qrDataUrl} className="w-full gap-2">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Descargar QR PNG
                </Button>
                <Button variant="outline" onClick={downloadQRSVG} disabled={!joinUrl} className="w-full gap-2">
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                  Descargar QR SVG
                </Button>
                <Button asChild variant="outline" className="w-full gap-2">
                  <Link href={`/dashboard/qr-codes/${card.id}/preview`}>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Probar Registro
                  </Link>
                </Button>
              </div>

              <p className="sr-only" aria-live="polite" aria-atomic="true">
                {copyMessage}
              </p>
            </div>
          </div>
        </section>

        <aside className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tarjeta</h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Nombre</p>
              <p className="break-words text-sm font-medium text-foreground">{card.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recompensa</p>
              <p className="break-words text-sm font-medium text-foreground">{card.reward}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Meta</p>
              <p className="text-sm font-medium text-foreground">{card.stampsRequired} sellos</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
              Usa este QR en redes sociales, mensajes o materiales digitales. Para piezas impresas, ajusta el formato abajo.
            </div>
          </div>
        </aside>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">Material Impreso</h2>
          <p className="text-sm text-muted-foreground">
            Personaliza el texto y descarga una pieza lista para imprimir.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Tamaño de impresión</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.entries(PDF_SIZES) as [PdfSizeKey, typeof PDF_SIZES[PdfSizeKey]][]).map(([key, { label }]) => (
                  <Button
                    key={key}
                    variant={pdfSize === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPdfSize(key)}
                    className="w-full"
                    aria-pressed={pdfSize === key}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label htmlFor="qr-cta" className="text-sm font-medium text-foreground">
                  Mensaje promocional
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="shrink-0 gap-1">
                      Recomendados <ChevronDown className="h-3 w-3" aria-hidden="true" />
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
              <input
                id="qr-cta"
                name="qr-cta"
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                aria-describedby="qr-cta-help"
                autoComplete="off"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                placeholder="Escanea para unirte…"
              />
              <p id="qr-cta-help" className="mt-2 text-xs text-muted-foreground">
                Este texto aparece en el PNG y PDF de impresión.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={downloadPNG} className="w-full gap-2" disabled={!qrDataUrl}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Descargar Material PNG
              </Button>

              <Button variant="outline" onClick={generateAndOpenPDF} className="w-full gap-2" disabled={!qrDataUrl || loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileText className="h-4 w-4" aria-hidden="true" />
                )}
                Abrir PDF
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Vista previa</p>
            <div className="flex min-h-44 items-center justify-center overflow-auto rounded-xl border border-border bg-muted/30 p-4">
              {qrDataUrl ? (
                <canvas ref={previewCanvasRef} className="shrink-0 rounded shadow-sm" />
              ) : (
                <span className="text-sm text-muted-foreground">Generando vista previa…</span>
              )}
            </div>
          </div>
        </div>
      </section>
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
