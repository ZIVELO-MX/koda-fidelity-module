import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, QrCode, Users, Stamp, Search, Archive } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { getCardIcon } from "@/lib/card-icons"
import { isExpired } from "@/lib/card-utils"
import { DeleteExpiredCardButton } from "@/components/dashboard/delete-expired-card-button"

const STATUS_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "expired", label: "Vencidas" },
] as const

type Status = "all" | "active" | "expired"

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { q, status: statusParam } = await searchParams
  const status: Status = (["all", "active", "expired"].includes(statusParam ?? "") ? statusParam : "all") as Status

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) redirect("/login")

  const business = await prisma.business.findUnique({ where: { email: user.email } })
  if (!business) redirect("/login")

  const where: Record<string, unknown> = { businessId: business.id, isActive: true }
  if (q?.trim()) where.name = { contains: q.trim(), mode: "insensitive" }

  const allCards = await prisma.loyaltyCard.findMany({
    where,
    include: {
      _count: { select: { customers: { where: { isActive: true } } } },
      customers: { where: { isActive: true }, select: { stamps: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const now = new Date()
  const enriched = allCards.map((c) => ({ ...c, expired: !!(c.expiresAt && c.expiresAt < now) }))

  const cards = status === "active"
    ? enriched.filter((c) => !c.expired)
    : status === "expired"
    ? enriched.filter((c) => c.expired)
    : enriched.sort((a, b) => Number(a.expired) - Number(b.expired))

  const expiredCount = enriched.filter((c) => c.expired).length

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tarjetas de Lealtad</h1>
          <p className="text-muted-foreground">Gestiona tus campañas de tarjetas de lealtad digitales</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/cards/archived">
            <Button variant="outline">
              <Archive className="h-4 w-4 mr-2" />
              Archivadas
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <form method="GET">
            <Input name="q" placeholder="Buscar tarjetas..." className="pl-10" defaultValue={q ?? ""} />
            {statusParam && <input type="hidden" name="status" value={statusParam} />}
          </form>
        </div>
        <div className="flex gap-1 bg-muted rounded-xl p-1 self-start">
          {STATUS_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={`?${new URLSearchParams({ ...(q ? { q } : {}), status: opt.value }).toString()}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                status === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
              {opt.value === "expired" && expiredCount > 0 && (
                <span className="ml-1.5 text-[10px] bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full font-semibold">
                  {expiredCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-20">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {q ? "No se encontraron tarjetas" : status === "expired" ? "Sin tarjetas vencidas" : "Aún no tienes tarjetas"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {q ? "Intenta con otro término de búsqueda"
              : status === "expired" ? "Todas tus tarjetas están activas 🎉"
              : "Crea tu primera tarjeta de lealtad para empezar"}
          </p>
          {!q && status !== "expired" && (
            <Link href="/dashboard/cards/new">
              <Button><Plus className="h-4 w-4 mr-2" />Crear Tarjeta</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`bg-card rounded-2xl border overflow-hidden hover:shadow-lg transition-shadow group ${
                card.expired ? "border-destructive/30 opacity-80" : "border-border"
              }`}
            >
              <div className="h-3" style={{ backgroundColor: card.brandColor }} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  {(() => {
                    const icon = getCardIcon(card.iconName)
                    const IconComp = icon?.Icon
                    if (card.iconName === "logo" && business.logoUrl) {
                      return (
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                          style={{ backgroundColor: card.brandColor }}
                        >
                          <img src={business.logoUrl} alt="" className="w-8 h-8 object-contain" />
                        </div>
                      )
                    }
                    return (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                        style={{ backgroundColor: card.brandColor }}
                      >
                        {IconComp ? <IconComp className="h-6 w-6" /> : card.name.charAt(0)}
                      </div>
                    )
                  })()}
                  <div className="flex items-center gap-2">
                    {card.expired ? (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-destructive/10 text-destructive">
                        Vencida
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">
                        Activa
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-lg text-foreground mb-1">{card.name}</h3>
                {card.description && <p className="text-sm text-muted-foreground mb-4">{card.description}</p>}

                <div className="bg-muted/50 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Recompensa</span>
                    <span className="font-medium text-foreground">{card.reward}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Sellos requeridos</span>
                    <span className="font-medium text-foreground">{card.stampsRequired}</span>
                  </div>
                  {card.expiresAt && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">{card.expired ? "Venció" : "Vence"}</span>
                      <span className={`font-medium ${card.expired ? "text-destructive" : "text-foreground"}`}>
                        {card.expiresAt.toLocaleDateString("es-MX")}
                      </span>
                    </div>
                  )}
                </div>

                {card.expired && (
                  <div className="bg-destructive/5 border border-destructive/15 rounded-xl p-3 mb-4">
                    <p className="text-xs text-destructive font-medium">
                      {card._count.customers} cliente{card._count.customers !== 1 ? "s" : ""} no {card._count.customers !== 1 ? "completaron" : "completó"} sus sellos
                    </p>
                  </div>
                )}

                {!card.expired && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 bg-muted/30 rounded-lg">
                      <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-sm font-semibold text-foreground">{card._count.customers}</p>
                      <p className="text-xs text-muted-foreground">Clientes</p>
                    </div>
                    <div className="text-center p-2 bg-muted/30 rounded-lg">
                      <Stamp className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-sm font-semibold text-foreground">
                        {card.customers.reduce((s, c) => s + c.stamps, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Sellos</p>
                    </div>
                    <div className="text-center p-2 bg-muted/30 rounded-lg">
                      <QrCode className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-sm font-semibold text-foreground">1</p>
                      <p className="text-xs text-muted-foreground">Código QR</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {card.expired ? (
                    <>
                      <Link href={`/dashboard/cards/${card.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">Ver Detalles</Button>
                      </Link>
                      <DeleteExpiredCardButton
                        cardId={card.id}
                        cardName={card.name}
                        affectedCustomers={card._count.customers}
                      />
                    </>
                  ) : (
                    <>
                      <Link href={`/dashboard/cards/${card.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">Ver Detalles</Button>
                      </Link>
                      <Link href={`/dashboard/scan?cardId=${card.id}`}>
                        <Button
                          variant="default"
                          className="flex-1 text-white"
                          style={{ backgroundColor: card.brandColor }}
                        >
                          <Stamp className="h-4 w-4 mr-2" />
                          Sellar
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {status !== "expired" && (
            <Link
              href="/dashboard/cards/new"
              className="bg-muted/30 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all flex flex-col items-center justify-center text-center p-8 min-h-[200px] sm:min-h-[400px]"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">Crear Nueva Tarjeta</h3>
              <p className="text-sm text-muted-foreground max-w-[200px]">
                Inicia una nueva campaña de lealtad y atrae a tus clientes
              </p>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
