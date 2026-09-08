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
      unsupported: "Este navegador no puede abrir la cámara",
      "not-supported": "Este navegador no puede abrir la cámara",
    }
    // El mensaje de la librería viene en inglés y no le dice nada a quien sella.
    // Nunca se muestra: se registra para diagnóstico y en pantalla va una frase
    // que sí se entiende.
    if (!messages[error.kind]) {
      console.warn("[QRScanner] error sin traducir:", error.kind, error.message)
    }
    onError?.(messages[error.kind] ?? "No se pudo abrir la cámara en este dispositivo")
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
