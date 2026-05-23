"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { Check, Mail, Loader2, ArrowLeft, Smartphone } from "lucide-react"
import { createBrowserSupabase } from "@/lib/supabase-browser"

type Step = "loading" | "error" | "form" | "sent" | "ready"

interface JoinCustomer {
  id: string
  name: string
  stamps: number
  card: {
    name: string
    stampsRequired: number
    reward: string
    brandColor: string
    business: { name: string; brandColor: string; logoUrl: string | null }
  }
}

export default function JoinCardPage() {
  const params = useParams()
  const cardId = params.cardId as string
  const [step, setStep] = useState<Step>("loading")
  const [customer, setCustomer] = useState<JoinCustomer | null>(null)
  const [cardError, setCardError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [nameError, setNameError] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const checkedSession = useRef(false)

  useEffect(() => {
    const init = async () => {
      const cardRes = await fetch(`/api/cards/${cardId}`)
      if (!cardRes.ok) {
        setCardError("Tarjeta no encontrada")
        setStep("error")
        return
      }

      const supabase = createBrowserSupabase()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user?.email) {
        const custRes = await fetch(
          `/api/join?email=${encodeURIComponent(session.user.email)}&cardId=${encodeURIComponent(cardId)}`,
        )
        if (custRes.ok) {
          const data = await custRes.json()
          if (data.customer) {
            setCustomer(data.customer)
            setStep("ready")
            checkedSession.current = true
            return
          }
        }

        const pendingId = sessionStorage.getItem(`pending-${cardId}`)
        if (pendingId) {
          const custRes2 = await fetch(`/api/join?id=${encodeURIComponent(pendingId)}`)
          if (custRes2.ok) {
            const data = await custRes2.json()
            if (data.customer) {
              setCustomer(data.customer)
              setStep("ready")
              checkedSession.current = true
              return
            }
          }
        }
      }

      setStep("form")
      checkedSession.current = true
    }

    init()
  }, [cardId])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setSendError(null)

    let hasError = false
    if (!name.trim()) {
      setNameError(true)
      hasError = true
    } else {
      setNameError(false)
    }
    if (!email.trim() || !email.includes("@")) {
      setEmailError(true)
      hasError = true
    } else {
      setEmailError(false)
    }
    if (hasError) return

    setSending(true)
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), cardId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al registrarte")
      }

      const { customerId } = await res.json()
      sessionStorage.setItem(`pending-${cardId}`, customerId)

      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/join/${cardId}`,
        },
      })
      if (error) throw error

      setStep("sent")
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Error al enviar el enlace")
    } finally {
      setSending(false)
    }
  }, [name, email, cardId])

  const cardInfo = customer
    ? {
        id: cardId,
        name: customer.card.name,
        reward: customer.card.reward,
        stampsRequired: customer.card.stampsRequired,
        brandColor: customer.card.brandColor,
        businessName: customer.card.business.name,
        businessBrandColor: customer.card.business.brandColor,
        businessLogoUrl: customer.card.business.logoUrl,
      }
    : null

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (step === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-foreground mb-2">Tarjeta no encontrada</h1>
        <p className="text-muted-foreground mb-4">{cardError || "El enlace no es válido"}</p>
        <Link href="/">
          <Button variant="outline">Volver al inicio</Button>
        </Link>
      </div>
    )
  }

  if (step === "ready" && customer && cardInfo) {
    const joinUrl = `${window.location.origin}/join/${cardId}`

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: customer.card.brandColor }}
              >
                {customer.card.business.name.charAt(0)}
              </div>
              <span className="font-semibold text-foreground">{customer.card.business.name}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">¡Bienvenido, {customer.name}!</h1>
              <p className="text-muted-foreground">
                Tu tarjeta de lealtad está lista. Muestra este código QR al pagar para ganar sellos.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-border">
              <LoyaltyCardPreview
                businessName={cardInfo.businessName}
                businessLogo={cardInfo.businessLogoUrl ?? undefined}
                customerName={customer.name}
                currentStamps={customer.stamps}
                maxStamps={cardInfo.stampsRequired}
                reward={cardInfo.reward}
                brandColor={cardInfo.brandColor}
                showQR={true}
                qrValue={customer.id}
              />
            </div>

            <div className="space-y-3">
              <Button
                disabled
                className="w-full h-14 bg-muted text-muted-foreground cursor-not-allowed"
                size="lg"
              >
                <svg className="h-6 w-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Apple Wallet — Próximamente
              </Button>
              <Button
                disabled
                className="w-full h-14 bg-muted text-muted-foreground cursor-not-allowed"
                size="lg"
              >
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google Wallet — Próximamente
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Escanea este código QR en el negocio para acumular sellos
            </p>

            <Link href="/">
              <Button variant="outline" className="w-full">
                Volver al inicio
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (step === "sent") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-center">
            <span className="font-semibold text-foreground">Revisa tu email</span>
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
                Te enviamos un enlace mágico a <strong>{email}</strong>. Haz clic en el enlace para confirmar tu tarjeta.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setStep("form")
                setSendError(null)
              }}
            >
              Volver
            </Button>
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
          <span className="font-semibold text-foreground">Obtén tu tarjeta de lealtad</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-8">
          {cardInfo ? (
            <div className="scale-90 origin-top">
              <LoyaltyCardPreview
                businessName={cardInfo.businessName}
                businessLogo={cardInfo.businessLogoUrl ?? undefined}
                customerName={name || "Tu Nombre"}
                currentStamps={0}
                maxStamps={cardInfo.stampsRequired}
                reward={cardInfo.reward}
                brandColor={cardInfo.brandColor}
                showQR={false}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          <div className="bg-card rounded-2xl p-6 border border-border">
            <h1 className="text-xl font-bold text-foreground text-center mb-1">
              Regístrate
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Ingresa tus datos para obtener tu tarjeta de lealtad
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tu Nombre</Label>
                <Input
                  id="name"
                  placeholder="Ej: Juan Pérez"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(false) }}
                  className="text-base"
                  autoComplete="name"
                  aria-invalid={nameError}
                />
                {nameError && <p className="text-sm text-red-500">El nombre es obligatorio</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(false) }}
                  className="text-base"
                  autoComplete="email"
                  aria-invalid={emailError}
                />
                {emailError && <p className="text-sm text-red-500">Ingresa un email válido</p>}
              </div>

              {sendError && <p className="text-sm text-red-500 text-center">{sendError}</p>}

              <Button type="submit" className="w-full" size="lg" disabled={sending}>
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  "Obtener Tarjeta"
                )}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Te enviaremos un enlace mágico a tu correo para confirmar tu identidad.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
