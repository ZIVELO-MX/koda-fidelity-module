"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { Mail, Loader2, ArrowLeft, Smartphone, Clock } from "lucide-react"
import { createBrowserSupabase } from "@/lib/supabase-browser"

const RATE_LIMIT_REGEX = /rate[\s_-]limit|over_request|429/i
const SECONDS_REGEX = /(\d+)\s*(?:seconds?|sec)/i

function getRateLimitCooldown(err: unknown): number {
  if (!(err instanceof Error)) return 90
  const seconds = err.message.match(SECONDS_REGEX)
  if (seconds) return Math.min(Number(seconds[1]), 300)
  return 90
}

interface MyCard {
  id: string
  name: string
  stamps: number
  createdAt: string
  card: {
    name: string
    stampsRequired: number
    reward: string
    brandColor: string
    business: { name: string; brandColor: string; logoUrl: string | null }
  }
}

type PageState = "loading" | "email" | "sent" | "cards"

export default function MyCardsPage() {
  const [state, setState] = useState<PageState>("loading")
  const [cards, setCards] = useState<MyCard[]>([])
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createBrowserSupabase()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user?.email) {
        try {
          const res = await fetch(`/api/join?email=${encodeURIComponent(session.user.email)}`)
          if (res.ok) {
            const data = await res.json()
            if (data.customers?.length) {
              setCards(data.customers)
              setState("cards")
              return
            }
          }
        } catch {
          // fall through to email form
        }
      }

      setState("email")
    }

    checkSession()
  }, [])

  useEffect(() => {
    const val = localStorage.getItem("magic-link-cooldown")
    if (!val) return

    const remaining = Math.floor((Number(val) - Date.now()) / 1000)
    if (remaining > 0) {
      queueMicrotask(() => setCooldown(remaining))
    } else {
      localStorage.removeItem("magic-link-cooldown")
    }
  }, [])

  useEffect(() => {
    if (cooldown > 0) {
      intervalRef.current = setInterval(() => {
        setCooldown((prev) => {
          const next = prev - 1
          if (next <= 0) {
            localStorage.removeItem("magic-link-cooldown")
            if (intervalRef.current) clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return next
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [cooldown])

  useEffect(() => {
    if (cooldown === 0) {
      queueMicrotask(() => setSendError(null))
    }
  }, [cooldown])

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
          emailRedirectTo: `${window.location.origin}/my-cards`,
        },
      })
      if (error) throw error
      setState("sent")
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      if (RATE_LIMIT_REGEX.test(msg)) {
        const seconds = getRateLimitCooldown(err)
        const until = Date.now() + seconds * 1000
        localStorage.setItem("magic-link-cooldown", String(until))
        setCooldown(seconds)
        setSendError("Espera un momento antes de pedir otro enlace")
      } else {
        setSendError("No fue posible enviar el enlace")
      }
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

  if (state === "email") {
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
                Ingresa tu email para ver todas tus tarjetas
              </p>
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

              <Button type="submit" className="w-full" size="lg" disabled={sending || cooldown > 0}>
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : cooldown > 0 ? (
                  <><Clock className="h-4 w-4 mr-2" /> Espera {cooldown}s</>
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
          <span className="font-semibold text-foreground">
            Mis Tarjetas ({cards.length})
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          {cards.map((c) => (
            <div key={c.id} className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <LoyaltyCardPreview
                businessName={c.card.business.name}
                businessLogo={c.card.business.logoUrl ?? undefined}
                customerName={c.name}
                currentStamps={c.stamps}
                maxStamps={c.card.stampsRequired}
                reward={c.card.reward}
                brandColor={c.card.brandColor}
                showQR={true}
                qrValue={c.id}
              />
              <p className="text-xs text-muted-foreground text-center">
                Muestra este código QR en el negocio para acumular sellos
              </p>
            </div>
          ))}

          {cards.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground mb-4">No tienes tarjetas de lealtad</p>
              <p className="text-sm text-muted-foreground">
                Escanea un código QR en un negocio para obtener tu primera tarjeta
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
