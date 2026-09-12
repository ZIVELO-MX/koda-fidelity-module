import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Archive } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { daysUntilExpiry } from "@/lib/card-utils"

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

  const business = await prisma.business.findFirst({ where: { users: { some: { authUserId: user.id } } } })
  if (!business) redirect("/login")

  const where: Record<string, unknown> = { businessId: business.id, isActive: true }
  if (q?.trim()) where.name = { contains: q.trim(), mode: "insensitive" }

  const allCards = await prisma.loyaltyCard.findMany({
    where,
    include: {
      _count: { select: { customers: { where: { isActive: true } } } },
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
          <h1 className="text-2xl font-bold text-foreground text-balance">Tarjetas de Lealtad</h1>
          <p className="text-muted-foreground">Gestiona tus campañas de tarjetas de lealtad digitales</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link href="/dashboard/cards/archived">
            <Button variant="outline">
              <Archive className="h-4 w-4 mr-2" aria-hidden="true" />
              Archivadas
            </Button>
          </Link>
          <Link href="/dashboard/cards/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Crear Tarjeta
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <form method="GET">
            <Input name="q" placeholder="Buscar tarjetas…" className="pl-10" defaultValue={q ?? ""} autoComplete="off" />
            {statusParam && <input type="hidden" name="status" value={statusParam} />}
          </form>
        </div>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1 sm:self-start">
          {STATUS_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={`?${new URLSearchParams({ ...(q ? { q } : {}), status: opt.value }).toString()}`}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
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
          {/* La tarjeta se muestra tal como la ve el cliente. Antes era una
              franja de color con la inicial del nombre, que no dice nada de lo
              que se publicó. */}
          {cards.map((card) => {
            const diasParaVencer = daysUntilExpiry(card.expiresAt)
            const vencimientoRequiereAtencion =
              card.expired || (diasParaVencer !== null && diasParaVencer <= 7)
            return (
              <div
                key={card.id}
                className={`overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg ${
                  card.expired ? "border-border opacity-80" : "border-border"
                }`}
              >
                <div className="p-5">
                  <LoyaltyCardPreview
                    businessName={business.name}
                    businessLogo={business.logoUrl ?? undefined}
                    iconName={card.iconName}
                    stampIconName={card.stampIconName}
                    customerName="Tus clientes"
                    currentStamps={0}
                    maxStamps={card.stampsRequired}
                    reward={card.reward}
                    showQR={false}
                    brandColor={card.brandColor}
                  />
                </div>

                <div className="space-y-3 px-5 pb-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 line-clamp-2 font-semibold text-foreground">{card.name}</h3>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        card.expired
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                          : "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300"
                      }`}
                    >
                      {card.expired ? "Vencida" : "Activa"}
                    </span>
                  </div>

                  <p className="truncate text-sm text-muted-foreground">{card.reward}</p>

                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{card._count.customers}</span>{" "}
                    cliente{card._count.customers !== 1 ? "s" : ""}
                  </p>

                  {/* El vencimiento solo aparece cuando pide algo. */}
                  {vencimientoRequiereAtencion && card.expiresAt && (
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      {card.expired
                        ? `Venció el ${card.expiresAt.toLocaleDateString("es-MX")}`
                        : diasParaVencer === 0
                        ? "Vence hoy"
                        : `Vence en ${diasParaVencer} día${diasParaVencer !== 1 ? "s" : ""}`}
                    </p>
                  )}

                  <Button asChild variant="outline" className="min-h-11 w-full">
                    <Link href={`/dashboard/cards/${card.id}`}>Ver tarjeta</Link>
                  </Button>
                </div>
              </div>
            )
          })}

          {status !== "expired" && (
            <Link
              href="/dashboard/cards/new"
              className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-[border-color,background-color] hover:border-primary/50 hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-[400px]"
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
