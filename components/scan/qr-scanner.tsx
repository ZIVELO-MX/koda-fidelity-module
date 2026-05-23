"use client"

import { useEffect, useRef } from "react"
import { Html5Qrcode } from "html5-qrcode"

interface QRScannerProps {
  onScan: (customerId: string) => void
  onError?: (error: string) => void
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const onScanRef = useRef(onScan)
  const onErrorRef = useRef(onError)
  onScanRef.current = onScan
  onErrorRef.current = onError

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const scannerId = `qr-scanner-${Math.random().toString(36).slice(2)}`
    el.id = scannerId

    const scanner = new Html5Qrcode(scannerId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const customerId = decodedText.trim()
          if (customerId.length > 10) {
            scanner.stop().catch(() => {})
            onScanRef.current(customerId)
          }
        },
        () => {},
      )
      .catch((err) => {
        onErrorRef.current?.(err?.message || "Error al acceder a la cámara")
      })

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="aspect-square max-h-[300px] w-full rounded-3xl overflow-hidden bg-muted"
    />
  )
}
