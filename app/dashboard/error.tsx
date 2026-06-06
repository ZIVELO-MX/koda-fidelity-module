"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, LogOut, Smartphone } from "lucide-react"
import { logout } from "@/lib/actions/auth"

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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
          <Link href="/dashboard/my-cards">
            <Button variant="outline">
              <Smartphone className="h-4 w-4 mr-2" />
              Mis Tarjetas
            </Button>
          </Link>
          <form action={logout}>
            <Button type="submit" variant="ghost">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </form>
        </div>
        <p className="text-xs text-muted-foreground">
          ¿Eres cliente? Ve directo a <Link href="/dashboard/my-cards" className="underline">Mis Tarjetas</Link>.
          Si el error persiste, cierra sesión e inicia de nuevo.
        </p>
      </div>
    </div>
  )
}
