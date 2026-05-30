"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GoogleButton } from "@/components/auth/google-button"
import { Mail, Loader2, ArrowLeft, Smartphone } from "lucide-react"
import { createBrowserSupabase } from "@/lib/supabase-browser"
import { getFriendlySendError } from "@/lib/auth-errors"

type PageState = "loading" | "email" | "sent"

export default function MyCardsPage() {
  const [state, setState] = useState<PageState>("loading")
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createBrowserSupabase()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user?.email) {
        redirect("/dashboard/my-cards")
        return
      }

      setState("email")
    }

    checkSession()
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setSendError(null)

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
          emailRedirectTo: `${window.location.origin}/dashboard/my-cards`,
        },
      })
      if (error) throw error
      setState("sent")
    } catch (err) {
      setSendError(getFriendlySendError(err))
    } finally {
      setSending(false)
    }
  }, [email])

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (state === "sent") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
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
              <h1 className="text-2xl font-bold text-foreground mb-2">Revisa tu correo</h1>
              <p className="text-muted-foreground">
                Te enviamos un enlace mágico a <strong>{email}</strong>. Haz clic para ver tus tarjetas.
              </p>
            </div>
            <Link
              href="/dashboard/my-cards"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
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
          <span className="font-semibold text-foreground">Mis Tarjetas</span>
        </div>
      </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-card rounded-2xl p-6 border border-border space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-1">Mis Tarjetas de Lealtad</h1>
            <p className="text-sm text-muted-foreground">
      Inicia sesión para ver todas tus tarjetas
            </p>
          </div>

          <GoogleButton redirectTo="/dashboard/my-cards" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">o con correo electrónico</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(false) }}
                className="text-base"
                aria-invalid={emailError}
              />
              {emailError && <p className="text-sm text-red-500">Ingresa un correo electrónico válido</p>}
            </div>

            {sendError && <p className="text-sm text-red-500 text-center">{sendError}</p>}

            <Button type="submit" className="w-full" size="lg" disabled={sending}>
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                "Enviar enlace mágico"
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
