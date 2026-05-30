"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { GoogleButton } from "@/components/auth/google-button"
import { ArrowLeft, Mail, Loader2, Smartphone, ChevronDown, ChevronUp, LogOut } from "lucide-react"
import { createBrowserSupabase } from "@/lib/supabase-browser"
import { getFriendlySendError } from "@/lib/auth-errors"
import { logout } from "@/lib/actions/auth"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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

export default function DashboardMyCardsPage() {
  const [state, setState] = useState<PageState>("loading")
  const [cards, setCards] = useState<MyCard[]>([])
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [hasDashboard, setHasDashboard] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const toggleCard = useCallback((cardId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createBrowserSupabase()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user?.email) {
        setSessionEmail(session.user.email)
        try {
          const bizRes = await fetch("/api/business")
          if (bizRes.ok) setHasDashboard(true)
        } catch {
          // not a business user
        }
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

      setState(session?.user?.email ? "cards" : "email")
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

  if (state === "email") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
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

  if (state === "sent") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
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
      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          {hasDashboard && (
            <div className="flex items-center justify-between mb-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al dashboard
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Tus tarjetas</h1>
            <span className="text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
              {cards.length}
            </span>
          </div>

          {cards.map((c) => {
            const isExpanded = expandedCards.has(c.id)
            return (
              <div key={c.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                <button
                  onClick={() => toggleCard(c.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors lg:cursor-default lg:hover:bg-transparent"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                      style={{ backgroundColor: c.card.brandColor }}
                    >
                      {c.card.business.name.charAt(0)}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-foreground truncate">{c.card.business.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {c.stamps}/{c.card.stampsRequired} sellos
                      </p>
                    </div>
                  </div>
                  <div className="lg:hidden">
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 lg:grid-rows-[1fr] lg:opacity-100"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-4">
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
                  </div>
                </div>
              </div>
            )
          })}

          {cards.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground mb-4">No tienes tarjetas de lealtad</p>
              <p className="text-sm text-muted-foreground">
                Escanea un código QR en un negocio para obtener tu primera tarjeta
              </p>
            </div>
          )}

          <div className="pt-6 border-t border-border">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full text-red-500 hover:text-red-600 border-red-200 hover:border-red-300" size="lg">
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cerrar Sesión</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Estás seguro de que deseas cerrar sesión?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => await logout()}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Cerrar Sesión
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </main>
    </div>
  )
}
