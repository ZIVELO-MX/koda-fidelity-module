"use client"

import { useState, useCallback } from "react"
import { Scanner } from "@yudiel/react-qr-scanner"
import type { IDetectedBarcode, IScannerError } from "@yudiel/react-qr-scanner"

interface QRScannerProps {
  onScan: (customerId: string) => void
  onError?: (error: string) => void
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [paused, setPaused] = useState(false)

  const handleScan = useCallback((detectedCodes: IDetectedBarcode[]) => {
    const code = detectedCodes[0]
    if (!code) return

    const customerId = code.rawValue.trim()
    if (!customerId) return

    setPaused(true)
    onScan(customerId)
  }, [onScan])

  const handleError = useCallback((error: IScannerError) => {
    const messages: Record<string, string> = {
      "permission-denied": "Permiso de cámara denegado",
      "no-camera": "No se detectó ninguna cámara",
      "in-use": "La cámara está siendo usada por otra aplicación",
      "insecure-context": "Se requiere HTTPS para acceder a la cámara",
      unsupported: "Escáner no soportado en este navegador",
    }
    onError?.(messages[error.kind] || error.message || "Error al acceder a la cámara")
  }, [onError])

  return (
    <div className="aspect-square max-h-[300px] w-full rounded-3xl overflow-hidden bg-muted relative">
      <Scanner
        formats={["qr_code"]}
        onScan={handleScan}
        onError={handleError}
        paused={paused}
        components={{ finder: true }}
        styles={{
          container: { width: "100%", height: "100%" },
          video: { objectFit: "cover" },
        }}
        allowMultiple={false}
      />
    </div>
  )
}
