import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/dashboard/stat-card"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { getCardIcon } from "@/lib/card-icons"
import { daysUntilExpiry } from "@/lib/card-utils"
import { CreditCard, Users, Stamp, TrendingUp, Plus, ArrowRight, AlertCircle, Eye, AlertTriangle } from "lucide-react"

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "hace unos segundos"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days}d`
  return date.toLocaleDateString("es-MX")
}

export default async function DashboardPage() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      redirect("/login")
    }

    const business = await prisma.business.findUnique({
      where: { email: user.email },
      select: { id: true, name: true, brandColor: true, logoUrl: true, iconName: true },
    })

    if (!business) {
      redirect("/login")
    }

    const cards = await prisma.loyaltyCard.findMany({
      where: { businessId: business.id, isActive: true },
      include: {
        _count: { select: { customers: { where: { isActive: true } } } },
        customers: { where: { isActive: true }, select: { stamps: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const allLogs = await prisma.stampLog.findMany({
      where: {
        customer: { card: { businessId: business.id } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        customer: { select: { name: true, card: { select: { name: true } } } },
      },
    })

    const activeCards = cards.length
    const totalCustomers = cards.reduce((sum, c) => sum + c._count.customers, 0)
    const stampsGiven = cards.reduce((sum, c) => sum + c.customers.reduce((s, cust) => s + cust.stamps, 0), 0)
    const redemptions = allLogs.filter((l) => l.type === "redeem").length

    const soonExpiring = cards
      .map((c) => ({ ...c, daysLeft: daysUntilExpiry(c.expiresAt) }))
      .filter((c) => c.daysLeft !== null && c.daysLeft >= 0 && c.daysLeft <= 7)

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel</h1>
          <p className="text-muted-foreground">¡Bienvenido, {business.name}! Esto es lo que está pasando.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/scan">
            <Button variant="outline">
              <Stamp className="h-4 w-4 mr-2" />
              Escáner
            </Button>
          </Link>
          <Link href="/dashboard/cards/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Tarjeta
            </Button>
          </Link>
        </div>
      </div>

      {soonExpiring.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {soonExpiring.length === 1 ? "Una tarjeta vence pronto" : `${soonExpiring.length} tarjetas vencen pronto`}
            </p>
            <ul className="space-y-0.5">
              {soonExpiring.map((c) => (
                <li key={c.id} className="text-sm text-amber-700 dark:text-amber-400">
                  <Link href={`/dashboard/cards/${c.id}`} className="hover:underline font-medium">{c.name}</Link>
                  {" — "}
                  {c.daysLeft === 0 ? "vence hoy" : `${c.daysLeft} día${c.daysLeft !== 1 ? "s" : ""}`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Tarjetas Activas" value={activeCards} icon={CreditCard} />
        <StatCard title="Total Clientes" value={totalCustomers} icon={Users} />
        <StatCard title="Sellos Entregados" value={stampsGiven} icon={Stamp} />
        <StatCard title="Canjes" value={redemptions} icon={TrendingUp} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Tus Tarjetas de Lealtad</h2>
            <Link href="/dashboard/cards" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
            {cards.map((card) => (
              <div
                key={card.id}
                className="bg-card rounded-2xl border border-border hover:shadow-md transition-shadow overflow-hidden min-w-0"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    {(() => {
                      const icon = getCardIcon(card.iconName)
                      const IconComp = icon?.Icon
                      return (
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                          style={{ backgroundColor: card.brandColor }}
                        >
                          {IconComp ? <IconComp className="h-5 w-5" /> : card.name.charAt(0)}
                        </div>
                      )
                    })()}
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full ml-2">
                      Activa
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 truncate">{card.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 truncate">
                    {card.stampsRequired} sellos para {card.reward}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">{card._count.customers}</span> clientes
                    </span>
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">{card.customers.reduce((s, c) => s + c.stamps, 0)}</span> sellos
                    </span>
                  </div>
                </div>
                <Link
                  href={`/dashboard/cards/${card.id}`}
                  className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-primary border-t border-border hover:bg-primary/5 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  Ver tarjeta
                </Link>
              </div>
            ))}
            <Link
              href="/dashboard/cards/new"
              className="bg-muted/50 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted transition-colors flex flex-col items-center justify-center text-center p-5 min-h-[200px]"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium text-foreground">Crear Nueva Tarjeta</p>
              <p className="text-sm text-muted-foreground">Inicia una nueva campaña de lealtad</p>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Actividad Reciente</h2>
            <Link
              href="/dashboard/customers"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Ver toda
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            {allLogs.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6">
                Aún no hay actividad. Crea una tarjeta y comparte el código QR.
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-3 lg:overflow-x-auto pb-2 lg:scrollbar-thin">
                {allLogs.map((log, i) => (
                  <div
                    key={log.id}
                    className={`${i >= 3 ? "hidden lg:flex" : ""} lg:flex-shrink-0 lg:w-56 bg-muted/30 rounded-xl p-4 hover:bg-muted/50 transition-colors`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          log.type === "stamp"
                            ? "bg-primary/10 text-primary"
                            : "bg-green-100 text-green-600"
                        }`}
                      >
                        {log.type === "stamp" ? (
                          <Stamp className="h-4 w-4" />
                        ) : (
                          <TrendingUp className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {log.customer.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {log.customer.card.name}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm">
                      {log.type === "stamp" ? "🎯 Recibió un sello" : "🎁 Canjeó recompensa"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {timeAgo(log.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {cards.length > 0 && (() => {
        const card = cards[0]
        const sampleCustomer = card.customers[0]
        return (
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 overflow-hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="max-w-md">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Tu tarjeta, en su billetera
                </h2>
                <p className="text-muted-foreground mb-4">
                  Así es como tus clientes ven su tarjeta de lealtad en Apple Wallet o Google Wallet.
                </p>
                <Link href="/dashboard/cards/new">
                  <Button variant="outline">
                    Personalizar Diseño
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="w-full max-w-full sm:max-w-xs overflow-hidden">
                <LoyaltyCardPreview
                  businessName={business.name}
                  businessLogo={business.logoUrl ?? undefined}
                  iconName={card.iconName ?? business.iconName}
                  customerName="Tus Clientes"
                  currentStamps={card.customers.length > 0 ? Math.max(...card.customers.map(c => c.stamps)) : 0}
                  maxStamps={card.stampsRequired}
                  reward={card.reward}
                  expirationDate={card.expiresAt ? card.expiresAt.toLocaleDateString("es-MX") : undefined}
                  brandColor={card.brandColor}
                />
              </div>
            </div>
          </div>
        )
      })()}

      {/* Mobile: link to docs */}
      <div className="lg:hidden">
        <Link
          href="/docs"
          className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border hover:shadow-md transition-shadow"
        >
          <div>
            <p className="font-medium text-foreground">Documentación</p>
            <p className="text-sm text-muted-foreground">Conoce más sobre la plataforma</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </Link>
      </div>
    </div>
  )
  } catch {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground mb-2">Error al cargar el panel</h2>
          <p className="text-muted-foreground">Ocurrió un error inesperado. Intenta de nuevo.</p>
        </div>
        <Link href="/dashboard">
          <Button>Reintentar</Button>
        </Link>
      </div>
    )
  }
}
