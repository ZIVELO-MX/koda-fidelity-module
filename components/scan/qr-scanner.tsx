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
    // El cuadrado se consigue limitando el ancho, no el alto. Con `w-full` y
    // `max-h`, el ancho ganaba y la caja quedaba 448x300: ni cuadrada, ni con
    // sitio para el marco del visor, que se recortaba contra el overflow.
    <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-muted">
      <Scanner
        formats={["qr_code"]}
        onScan={handleScan}
        onError={handleError}
        paused={paused}
        // El marco propio va abajo: la librería solo deja estilar el contenedor
        // y el vídeo, así que su marco rojo no se puede llevar al acento de KODA.
        components={{ finder: false }}
        styles={{
          container: { width: "100%", height: "100%" },
          video: { objectFit: "cover" },
        }}
        allowMultiple={false}
      />

      <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="relative h-3/5 w-3/5">
          {[
            "left-0 top-0 rounded-tl-lg border-l-4 border-t-4",
            "right-0 top-0 rounded-tr-lg border-r-4 border-t-4",
            "bottom-0 left-0 rounded-bl-lg border-b-4 border-l-4",
            "bottom-0 right-0 rounded-br-lg border-b-4 border-r-4",
          ].map((esquina) => (
            <span key={esquina} className={`absolute h-9 w-9 border-primary ${esquina}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
