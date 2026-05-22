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
        <h1 className="text-2xl font-bold text-foreground">QR Codes</h1>
        <p className="text-muted-foreground">Print or share QR codes for customers to join your loyalty programs</p>
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
                  <p className="text-xs text-muted-foreground">{qr.scans} scans total</p>
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
                <p className="text-xs text-muted-foreground mb-1">Landing page URL</p>
                <p className="text-sm text-foreground font-mono truncate">{qr.url}</p>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-6">
                <span>Last scan: {qr.lastScan}</span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" className="w-full">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
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
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy URL
                    </>
                  )}
                </Button>
                <Button variant="ghost" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Print Tips */}
      <div className="bg-muted/30 rounded-2xl p-6 border border-border">
        <h3 className="font-semibold text-foreground mb-2">Printing Tips</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">1.</span>
            Download the QR code as a high-resolution PNG or SVG for best print quality
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">2.</span>
            Place QR codes at checkout counters, tables, or entrances where customers can easily scan
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">3.</span>
            Add a call-to-action like &quot;Scan to join our rewards program&quot; near the QR code
          </li>
        </ul>
      </div>
    </div>
  )
}
