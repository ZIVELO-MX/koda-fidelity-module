"use client"

import { Suspense, useState, useCallback, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, AlertCircle, Clock, Loader2, ArrowLeft } from "lucide-react"
import { createBrowserSupabase } from "@/lib/supabase-browser"

const RATE_LIMIT_REGEX = /rate[\s_-]limit|over_request|429/i
const SECONDS_REGEX = /(\d+)\s*(?:seconds?|sec)/i

function getRateLimitCooldown(err: unknown): number {
  if (!(err instanceof Error)) return 90
  const seconds = err.message.match(SECONDS_REGEX)
  if (seconds) return Math.min(Number(seconds[1]), 300)
  return 90
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}

function AuthErrorContent() {
  const sp = useSearchParams()
  const errorCode = sp.get("error_code") || ""
  const errorDesc = sp.get("error_description") || ""

  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [emailError, setEmailError] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isExpired = errorCode === "otp_expired"
  const isRateLimit = errorCode === "rate_limit"

  useEffect(() => {
    if (!isRateLimit) return

    queueMicrotask(() => setCooldown(60))
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return c - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRateLimit])

  useEffect(() => {
    const val = localStorage.getItem("magic-link-cooldown")
    if (!val) return

    const remaining = Math.floor((Number(val) - Date.now()) / 1000)
    if (remaining > 0) {
      queueMicrotask(() => setCooldown(remaining))
      timerRef.current = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 0
          }
          return c - 1
        })
      }, 1000)
    } else {
      localStorage.removeItem("magic-link-cooldown")
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleResend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
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
      localStorage.setItem("magic-link-cooldown", String(Date.now() + 90000))
      setCooldown(90)
      setSent(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      if (RATE_LIMIT_REGEX.test(msg)) {
        const seconds = getRateLimitCooldown(err)
        localStorage.setItem("magic-link-cooldown", String(Date.now() + seconds * 1000))
        setCooldown(seconds)
      }
    } finally {
      setSending(false)
    }
  }, [email])

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card">
          <div className="max-w-lg mx-auto px-4 py-4">
            <span className="font-semibold text-foreground">Revisa tu email</span>
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
              {cooldown > 0 ? (
                <p>Espera {cooldown}s para reenviar</p>
              ) : (
                <button
                  onClick={() => setSent(false)}
                  className="text-primary hover:underline"
                >
                  Reenviar de nuevo
                </button>
              )}
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
    <div className="min-h-screen bg-background flex flex-col">
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
                isExpired ? "bg-amber-100" : isRateLimit ? "bg-red-100" : "bg-muted"
              }`}
            >
              {isExpired ? (
                <Clock className="h-8 w-8 text-amber-600" />
              ) : isRateLimit ? (
                <AlertCircle className="h-8 w-8 text-red-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            <h1 className="text-xl font-bold text-foreground">
              {isExpired
                ? "Enlace Expirado"
                : isRateLimit
                ? "Demasiados Intentos"
                : "Error de Autenticación"}
            </h1>

            <p className="text-muted-foreground">
              {isExpired
                ? "El enlace mágico que clickeaste ya no es válido. Solicita uno nuevo abajo."
                : isRateLimit
                ? "Has solicitado demasiados enlaces en poco tiempo. Espera un minuto antes de intentar de nuevo."
                : errorDesc || "Ocurrió un error al iniciar sesión. Intenta de nuevo."}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
            <h2 className="font-semibold text-foreground">Reenviar enlace mágico</h2>

            <form onSubmit={handleResend} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Tu correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(false) }}
                  className="text-base"
                  aria-invalid={emailError}
                />
                {emailError && <p className="text-sm text-red-500">Ingresa un email válido</p>}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={sending || cooldown > 0}
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : cooldown > 0 ? (
                  <>
                    <Clock className="h-5 w-5 mr-2" />
                    Espera {cooldown}s
                  </>
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
