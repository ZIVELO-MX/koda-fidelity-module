"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GoogleButton } from "@/components/auth/google-button"
import { Mail, AlertCircle, Loader2, ArrowLeft, Clock } from "lucide-react"
import { createBrowserSupabase } from "@/lib/supabase-browser"
import { getFriendlyAuthError, getFriendlySendError } from "@/lib/auth-errors"

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background forced-light flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
    </Suspense>
  )
}

function AuthErrorContent() {
  const sp = useSearchParams()
  const errorCode = sp.get("error_code") || ""
  const errorMessage = sp.get("error") || ""
  const errorDescription = sp.get("error_description") || ""

  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  const isExpired = errorCode === "otp_expired"
  const isRateLimit = errorCode === "rate_limit"

  const knownError = !isExpired && !isRateLimit && (errorMessage || errorCode)
  const friendlyError = knownError ? getFriendlyAuthError(errorMessage, errorCode) : null

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    setResendError(null)
    if (!email.trim() || !email.includes("@")) {
      setEmailError(true)
      return
    }
    setEmailError(false)
    setSending(true)

    try {
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/my-cards`,
        },
      })
      if (error) throw error
      setSent(true)
    } catch (err) {
      setResendError(getFriendlySendError(err))
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-background forced-light flex flex-col">
        <header className="border-b border-border bg-card">
          <div className="max-w-lg mx-auto px-4 py-4">
            <span className="font-semibold text-foreground">Revisa tu correo electrónico</span>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Enlace enviado</h1>
              <p className="text-muted-foreground">
                Te enviamos un nuevo enlace mágico a <strong>{email}</strong>.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <button
                onClick={() => setSent(false)}
                className="text-primary hover:underline"
              >
                Reenviar de nuevo
              </button>
            </div>
            <Link href="/my-cards">
              <Button variant="outline" className="w-full">
                Mis Tarjetas
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background forced-light flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold text-foreground">Error de autenticación</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-card rounded-2xl p-6 border border-border text-center space-y-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                isExpired ? "bg-amber-100" : isRateLimit ? "bg-red-100" : friendlyError ? "bg-orange-100" : "bg-muted"
              }`}
            >
              {isExpired || (friendlyError?.title === "Enlace Expirado") ? (
                <Clock className="h-8 w-8 text-amber-600" />
              ) : isRateLimit || (friendlyError?.title === "Demasiados Intentos") ? (
                <AlertCircle className="h-8 w-8 text-red-600" />
              ) : (
                <AlertCircle className={`h-8 w-8 ${friendlyError ? "text-orange-600" : "text-muted-foreground"}`} />
              )}
            </div>

            <h1 className="text-xl font-bold text-foreground">
              {friendlyError?.title ?? (isExpired ? "Enlace Expirado" : isRateLimit ? "Demasiados Intentos" : "Error de Autenticación")}
            </h1>

            <p className="text-muted-foreground">
              {friendlyError?.description ?? (isExpired
                ? "El enlace mágico que clickeaste ya no es válido. Solicita uno nuevo abajo."
                : isRateLimit
                ? "Has solicitado demasiados enlaces en poco tiempo. Espera un minuto antes de intentar de nuevo."
                : errorDescription || errorMessage || "Ocurrió un error al iniciar sesión. Intenta de nuevo.")}
            </p>
          </div>

          {isRateLimit && (
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <h2 className="font-semibold text-foreground text-center">Prueba con Google</h2>
              <p className="text-sm text-muted-foreground text-center">
                El límite de enlaces por correo está agotado. Usa Google para acceder al instante.
              </p>
              <GoogleButton redirectTo="/my-cards" />
            </div>
          )}

          <div className={`bg-card rounded-2xl p-6 border border-border space-y-4 ${isRateLimit ? "opacity-60" : ""}`}>
            <h2 className="font-semibold text-foreground">Reenviar enlace mágico</h2>

            <form onSubmit={handleResend} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Tu correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(false); setResendError(null) }}
                  className="text-base"
                  aria-invalid={emailError || !!resendError}
                />
                {emailError && <p className="text-sm text-red-500">Ingresa un correo electrónico válido</p>}
                {resendError && <p className="text-sm text-red-500">{resendError}</p>}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  "Reenviar enlace mágico"
                )}
              </Button>
            </form>
          </div>

          <div className="flex justify-center gap-4">
            <Link href="/my-cards">
              <Button variant="outline">Mis Tarjetas</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost">Inicio</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
