"use client"

import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Download, Printer, Copy, ExternalLink, Check } from "lucide-react"
import { useState } from "react"

const qrCodes = [
  {
    id: "1",
    cardName: "Coffee Rewards",
    url: "https://koda.app/join/coffee-rewards",
    color: "#f97316",
    scans: 234,
    lastScan: "5 min ago",
  },
  {
    id: "2",
    cardName: "Lunch Special",
    url: "https://koda.app/join/lunch-special",
    color: "#3b82f6",
    scans: 89,
    lastScan: "2 hours ago",
  },
]

export default function QRCodesPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Códigos QR</h1>
        <p className="text-muted-foreground">Imprime o comparte códigos QR para que los clientes se unan a tus programas de lealtad</p>
      </div>

      {/* QR Codes Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {qrCodes.map((qr) => (
          <div
            key={qr.id}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            {/* Color bar */}
            <div className="h-2" style={{ backgroundColor: qr.color }} />
            
            <div className="p-6">
              {/* Card info */}
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: qr.color }}
                >
                  {qr.cardName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{qr.cardName}</h3>
                  <p className="text-xs text-muted-foreground">{qr.scans} escaneos totales</p>
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-white rounded-2xl p-6 flex items-center justify-center mb-6 border border-border">
                <QRCodeSVG
                  value={qr.url}
                  size={180}
                  level="H"
                  fgColor={qr.color}
                  imageSettings={{
                    src: "",
                    height: 0,
                    width: 0,
                    excavate: false,
                  }}
                />
              </div>

              {/* URL */}
              <div className="bg-muted/50 rounded-xl p-3 mb-4">
                <p className="text-xs text-muted-foreground mb-1">URL de destino</p>
                <p className="text-sm text-foreground font-mono truncate">{qr.url}</p>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-6">
                <span>Último escaneo: {qr.lastScan}</span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
                <Button variant="outline" className="w-full">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => copyToClipboard(qr.url, qr.id)}
                >
                  {copiedId === qr.id ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar URL
                    </>
                  )}
                </Button>
                <Button variant="ghost" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Vista Previa
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

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
