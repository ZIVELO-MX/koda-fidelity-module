"use client"

import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground mb-2">Algo salió mal</h1>
          <p className="text-muted-foreground">
            Ocurrió un error inesperado al cargar esta página. Intenta de nuevo.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
          <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
            Ir al panel
          </Button>
        </div>
      </div>
    </div>
  )
}
