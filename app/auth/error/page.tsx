"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle, Clock, Loader2 } from "lucide-react"
import { GoogleButton } from "@/components/auth/google-button"
import { Button } from "@/components/ui/button"
import { getFriendlyAuthError } from "@/lib/auth-errors"

export default function AuthErrorPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}><AuthErrorContent /></Suspense>
}

function AuthErrorContent() {
  const params = useSearchParams()
  const code = params.get("error_code") ?? ""
  const message = params.get("error") ?? params.get("error_description") ?? ""
  const expired = code === "otp_expired"
  const rateLimited = code === "rate_limit"
  const friendly = getFriendlyAuthError(message, code)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 forced-light">
      <section className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 text-center">
        {expired ? <Clock className="mx-auto h-8 w-8 text-amber-600" /> : <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />}
        <h1 className="text-xl font-bold">{friendly?.title ?? (expired ? "Enlace expirado" : "Error de autenticación")}</h1>
        <p className="text-muted-foreground">{friendly?.description ?? (expired ? "El enlace ya no es válido. Inicia sesión para pedir uno nuevo." : message || "Ocurrió un error al iniciar sesión. Intenta de nuevo.")}</p>
        {rateLimited && <GoogleButton redirectTo="/dashboard/my-cards" />}
      </section>
      <div className="flex gap-3">
        <Button asChild variant="outline"><Link href="/login">Iniciar sesión</Link></Button>
        <Button asChild><Link href="/signup">Crear cuenta</Link></Button>
      </div>
    </main>
  )
}
