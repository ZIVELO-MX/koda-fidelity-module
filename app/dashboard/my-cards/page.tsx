"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { GoogleButton } from "@/components/auth/google-button"
import {
  ArrowLeft, Mail, Loader2, Smartphone, ChevronDown, LogOut,
  Wallet, Download, Trash2, Search, RefreshCw, AlertTriangle, Clock,
} from "lucide-react"
import { getCardIcon } from "@/lib/card-icons"
import { createBrowserSupabase } from "@/lib/supabase-browser"
import { getFriendlySendError } from "@/lib/auth-errors"
import { logout } from "@/lib/actions/auth"
import { isExpired, daysUntilExpiry } from "@/lib/card-utils"
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
    iconName: string | null
    expiresAt: string | null
    business: { name: string; brandColor: string; logoUrl: string | null; iconName: string | null }
  }
}

type PageState = "loading" | "email" | "sent" | "cards"

function expiredMessage(stamps: number, required: number): string {
  if (stamps === 0) return "Esta tarjeta venció antes de comenzar 🤷"
  if (stamps >= required - 1) return "¡Tan cerca y tan lejos! Solo te faltó 1 sello 😅"
  return `¡Ups! No alcanzaste los ${required} sellos — llegaste a ${stamps} 🫠`
}

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  const days = daysUntilExpiry(expiresAt)
  if (days === null) return null
  if (days <= 0) return null // expired — handled separately
  if (days <= 1)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
        <Clock className="h-2.5 w-2.5" />
        Vence hoy
      </span>
    )
  if (days <= 7)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        <AlertTriangle className="h-2.5 w-2.5" />
        {days}d restantes
      </span>
    )
  return null
}

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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [showExpired, setShowExpired] = useState(false)

  const toggleCard = useCallback((cardId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      next.has(cardId) ? next.delete(cardId) : next.add(cardId)
      return next
    })
  }, [])

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const loadCards = useCallback(async () => {
    const supabase = createBrowserSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user?.email) {
      setSessionEmail(session.user.email)
      try {
        const bizRes = await fetch("/api/business")
        if (bizRes.ok) setHasDashboard(true)
      } catch { /* not a business user */ }
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
      } catch { /* fall through */ }
    }

    setState(session?.user?.email ? "cards" : "email")
  }, [])

  useEffect(() => { loadCards() }, [loadCards])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    loadCards().finally(() => setRefreshing(false))
  }, [loadCards])

  const activeCards = useMemo(() => cards.filter((c) => !isExpired(c.card.expiresAt)), [cards])
  const expiredCards = useMemo(() => cards.filter((c) => isExpired(c.card.expiresAt)), [cards])

  const filteredActive = useMemo(() => {
    if (!search.trim()) return activeCards
    const q = search.toLowerCase()
    return activeCards.filter(
      (c) => c.card.business.name.toLowerCase().includes(q) || c.card.name.toLowerCase().includes(q),
    )
  }, [activeCards, search])

  const groupedCards = useMemo(() => {
    const groups = new Map<string, MyCard[]>()
    for (const c of filteredActive) {
      const key = c.card.business.name
      const group = groups.get(key) ?? []
      group.push(c)
      groups.set(key, group)
    }
    return Array.from(groups.entries())
  }, [filteredActive])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setSendError(null)
    if (!email.trim() || !email.includes("@")) { setEmailError(true); return }
    setEmailError(false)
    setSending(true)
    try {
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/dashboard/my-cards` },
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
              <p className="text-sm text-muted-foreground">Inicia sesión para ver todas tus tarjetas</p>
            </div>
            <GoogleButton redirectTo="/dashboard/my-cards" />
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">o con correo electrónico</span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" type="email" placeholder="ejemplo@correo.com" value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(false) }}
                  className="text-base" aria-invalid={emailError}
                />
                {emailError && <p className="text-sm text-red-500">Ingresa un correo electrónico válido</p>}
              </div>
              {sendError && <p className="text-sm text-red-500 text-center">{sendError}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={sending}>
                {sending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Enviar enlace mágico"}
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
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Volver al dashboard
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">Tus tarjetas</h1>
              <span className="text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                {activeCards.length}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Recargar tarjetas"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {cards.length >= 5 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input type="search" placeholder="Buscar negocio o tarjeta..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          )}

          <div className="hidden lg:block">
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
                  <AlertDialogDescription>¿Estás seguro de que deseas cerrar sesión?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => await logout()} className="bg-red-500 hover:bg-red-600">
                    Cerrar Sesión
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Active cards grouped by business */}
          {groupedCards.map(([businessName, businessCards]) => {
            const isGroupCollapsed = collapsedGroups.has(businessName)
            return (
              <div key={businessName} className="space-y-3">
                <button onClick={() => toggleGroup(businessName)}
                  className="w-full flex items-center gap-2 py-1 hover:opacity-75 transition-opacity"
                  aria-expanded={!isGroupCollapsed}
                >
                  {businessCards[0].card.business.logoUrl ? (
                    <img src={businessCards[0].card.business.logoUrl} alt="" className="w-5 h-5 rounded-md object-contain" />
                  ) : null}
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex-1 text-left">
                    {businessName}
                  </h2>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {businessCards.length}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isGroupCollapsed ? "-rotate-90" : ""}`} />
                </button>

                <div className={`grid transition-all duration-300 ease-in-out ${isGroupCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}>
                  <div className="overflow-hidden space-y-3">
                    {businessCards.map((c) => {
                      const isExpanded = expandedCards.has(c.id)
                      const days = daysUntilExpiry(c.card.expiresAt)
                      return (
                        <div key={c.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                          {/* Near-expiry banner */}
                          {days !== null && days > 0 && days <= 7 && (
                            <div className={`px-4 py-2 text-xs font-medium flex items-center gap-1.5 ${days <= 1 ? "bg-destructive/10 text-destructive" : "bg-amber-50 text-amber-700"}`}>
                              {days <= 1 ? <Clock className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                              {days <= 1 ? "Esta tarjeta vence hoy o mañana — úsala antes de que expire" : `Esta tarjeta vence en ${days} días`}
                            </div>
                          )}
                          <button onClick={() => toggleCard(c.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                            aria-expanded={isExpanded}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {(() => {
                                const icon = getCardIcon(c.card.iconName ?? c.card.business.iconName)
                                const IconComp = icon?.Icon
                                return (
                                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 overflow-hidden"
                                    style={{ backgroundColor: c.card.brandColor }}>
                                    {c.card.business.logoUrl ? (
                                      <img src={c.card.business.logoUrl} alt="" className="w-full h-full object-contain" />
                                    ) : IconComp ? <IconComp className="h-5 w-5" /> : c.card.business.name.charAt(0)}
                                  </div>
                                )
                              })()}
                              <div className="text-left min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-foreground truncate">{c.card.name}</p>
                                  <ExpiryBadge expiresAt={c.card.expiresAt} />
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {c.stamps}/{c.card.stampsRequired} sellos
                                </p>
                              </div>
                            </div>
                            <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                          <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                            <div className="overflow-hidden">
                              <div className="px-4 pb-4 space-y-4">
                                <LoyaltyCardPreview
                                  businessName={c.card.business.name}
                                  businessLogo={c.card.business.logoUrl ?? undefined}
                                  iconName={c.card.iconName ?? c.card.business.iconName}
                                  customerName={c.name}
                                  currentStamps={c.stamps}
                                  maxStamps={c.card.stampsRequired}
                                  reward={c.card.reward}
                                  expirationDate={c.card.expiresAt ? new Date(c.card.expiresAt).toLocaleDateString("es-MX") : undefined}
                                  brandColor={c.card.brandColor}
                                  showQR={true}
                                  qrValue={c.id}
                                />
                                <p className="text-xs text-muted-foreground text-center">
                                  Muestra este código QR en el negocio para acumular sellos
                                </p>
                                <div className="flex flex-col gap-2 pt-2">
                                  <Button variant="outline" size="sm" disabled className="w-full text-muted-foreground/50 border-dashed gap-2">
                                    <Wallet className="h-4 w-4" />Agregar a Wallet — Próximamente
                                  </Button>
                                  <Button variant="outline" size="sm" disabled className="w-full text-muted-foreground/50 border-dashed gap-2">
                                    <Download className="h-4 w-4" />Descargar Tarjeta — Próximamente
                                  </Button>
                                  <Button variant="outline" size="sm" disabled className="w-full text-muted-foreground/50 border-dashed gap-2">
                                    <Trash2 className="h-4 w-4" />Eliminar Tarjeta — Próximamente
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Expired cards section */}
          {expiredCards.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowExpired((v) => !v)}
                className="w-full flex items-center gap-2 py-1 hover:opacity-75 transition-opacity"
                aria-expanded={showExpired}
              >
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex-1 text-left">
                  Tarjetas vencidas
                </span>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {expiredCards.length}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showExpired ? "" : "-rotate-90"}`} />
              </button>

              <div className={`grid transition-all duration-300 ease-in-out ${showExpired ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden space-y-3">
                  {expiredCards.map((c) => (
                    <div key={c.id} className="bg-card rounded-2xl border border-border overflow-hidden opacity-80">
                      <div className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 opacity-50 overflow-hidden"
                          style={{ backgroundColor: c.card.brandColor }}>
                          {c.card.business.logoUrl
                            ? <img src={c.card.business.logoUrl} alt="" className="w-full h-full object-contain" />
                            : c.card.business.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{c.card.name}</p>
                          <p className="text-xs text-muted-foreground">{c.card.business.name}</p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                          Vencida
                        </span>
                      </div>
                      <div className="px-4 pb-4 pt-0 border-t border-border/50">
                        <div className="bg-muted/50 rounded-xl p-4 text-center space-y-1 mb-3">
                          <p className="text-sm font-medium text-foreground">
                            {expiredMessage(c.stamps, c.card.stampsRequired)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Llegaste a {c.stamps} de {c.card.stampsRequired} sellos
                          </p>
                          {c.card.expiresAt && (
                            <p className="text-xs text-muted-foreground">
                              Venció el {new Date(c.card.expiresAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="h-4 w-4" />Eliminar tarjeta
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar tarjeta vencida?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará <strong>{c.card.name}</strong> de {c.card.business.name} con {c.stamps} sello{c.stamps !== 1 ? "s" : ""}. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={async () => {
                                  await fetch(`/api/my-cards/${c.id}`, { method: "DELETE" })
                                  setCards((prev) => prev.filter((card) => card.id !== c.id))
                                }}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {cards.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground mb-4">No tienes tarjetas de lealtad</p>
              <p className="text-sm text-muted-foreground">
                Escanea un código QR en un negocio para obtener tu primera tarjeta
              </p>
            </div>
          )}

          {cards.length > 0 && filteredActive.length === 0 && search.trim() && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Sin resultados para &ldquo;{search}&rdquo;</p>
            </div>
          )}

          <div className="pt-6 border-t border-border lg:hidden">
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
                  <AlertDialogDescription>¿Estás seguro de que deseas cerrar sesión?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => await logout()} className="bg-red-500 hover:bg-red-600">
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
