import Link from "next/link"
import { redirect } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Stamp, Gift, Calendar, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CustomerActionsMenu } from "@/components/dashboard/customer-actions-menu"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"

type SortField = "name" | "stamps" | "createdAt"
type SortOrder = "asc" | "desc"

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "hace unos segundos"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

function sortLink(
  field: SortField,
  currentSort: SortField,
  currentOrder: SortOrder,
  base: URLSearchParams
): string {
  const p = new URLSearchParams(base)
  p.set("sort", field)
  p.set("order", currentSort === field && currentOrder === "asc" ? "desc" : "asc")
  return `/dashboard/customers?${p.toString()}`
}

function SortIcon({ field, currentSort, currentOrder }: { field: SortField; currentSort: SortField; currentOrder: SortOrder }) {
  if (field !== currentSort) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40 shrink-0" />
  return currentOrder === "asc"
    ? <ChevronUp className="h-3.5 w-3.5 shrink-0" />
    : <ChevronDown className="h-3.5 w-3.5 shrink-0" />
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; order?: string; card?: string }>
}) {
  const { q, sort: sortParam, order: orderParam, card: cardFilter } = await searchParams

  const sort: SortField = (["name", "stamps", "createdAt"].includes(sortParam ?? "") ? sortParam : "createdAt") as SortField
  const order: SortOrder = orderParam === "asc" ? "asc" : "desc"

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) redirect("/login")

  const business = await prisma.business.findUnique({ where: { email: user.email } })
  if (!business) redirect("/login")

  const [loyaltyCards, customers] = await Promise.all([
    prisma.loyaltyCard.findMany({
      where: { businessId: business.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: {
        card: { businessId: business.id },
        isActive: true,
        ...(q?.trim() ? { name: { contains: q.trim(), mode: "insensitive" } } : {}),
        ...(cardFilter ? { cardId: cardFilter } : {}),
      },
      include: {
        card: { select: { name: true, stampsRequired: true, reward: true } },
        _count: { select: { stampsLog: { where: { type: "redeem" } } } },
      },
      orderBy: { [sort]: order },
    }),
  ])

  // Preserve current params when building sort/filter links
  const baseParams = new URLSearchParams({
    ...(q ? { q } : {}),
    ...(cardFilter ? { card: cardFilter } : {}),
  })

  const activeCard = loyaltyCards.find((c) => c.id === cardFilter)

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Consulta y gestiona los miembros de tu programa de lealtad</p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/dashboard/cards">Ver tarjetas</Link>
        </Button>
      </div>

      {/* Search + card filter */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <form method="GET">
              <Input
                name="q"
                placeholder="Buscar clientes..."
                className="pl-10"
                defaultValue={q ?? ""}
              />
              {cardFilter && <input type="hidden" name="card" value={cardFilter} />}
              {sortParam && <input type="hidden" name="sort" value={sortParam} />}
              {orderParam && <input type="hidden" name="order" value={orderParam} />}
            </form>
          </div>
          {(q || cardFilter) && (
            <Button asChild variant="ghost">
              <Link href="/dashboard/customers">Limpiar filtros</Link>
            </Button>
          )}
        </div>

        {/* Card filter pills */}
        {loyaltyCards.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Link
              href={`/dashboard/customers?${new URLSearchParams({ ...(q ? { q } : {}), ...(sortParam ? { sort: sortParam } : {}), ...(orderParam ? { order: orderParam } : {}) }).toString()}`}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                !cardFilter
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas las tarjetas
            </Link>
            {loyaltyCards.map((card) => {
              const p = new URLSearchParams({
                ...(q ? { q } : {}),
                card: card.id,
                ...(sortParam ? { sort: sortParam } : {}),
                ...(orderParam ? { order: orderParam } : {}),
              })
              return (
                <Link
                  key={card.id}
                  href={`/dashboard/customers?${p.toString()}`}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    cardFilter === card.id
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {card.name}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-20">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {q || cardFilter ? "No se encontraron clientes" : "Aún no tienes clientes"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {q
              ? "Intenta con otro término de búsqueda"
              : cardFilter
              ? `No hay clientes en "${activeCard?.name ?? "esta tarjeta"}"`
              : "Los clientes se registrarán al unirse a tus tarjetas"}
          </p>
          {!q && !cardFilter && (
            <Button asChild variant="outline">
              <Link href="/dashboard/cards">Ver tarjetas</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                    <Link
                      href={sortLink("name", sort, order, baseParams)}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Cliente
                      <SortIcon field="name" currentSort={sort} currentOrder={order} />
                    </Link>
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                    Tarjeta
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                    <Link
                      href={sortLink("stamps", sort, order, baseParams)}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Progreso
                      <SortIcon field="stamps" currentSort={sort} currentOrder={order} />
                    </Link>
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                    <Link
                      href={sortLink("createdAt", sort, order, baseParams)}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Registro
                      <SortIcon field="createdAt" currentSort={sort} currentOrder={order} />
                    </Link>
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                    Canjes
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground px-6 py-4">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                            {customer.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-foreground">{customer.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {customer.card.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-[80px] max-w-[120px]">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${Math.min((customer.stamps / customer.card.stampsRequired) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {customer.stamps}/{customer.card.stampsRequired}
                        </span>
                        {customer.stamps >= customer.card.stampsRequired && (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <Gift className="h-3 w-3" />
                            Listo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {timeAgo(customer.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Stamp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{customer._count.stampsLog}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <CustomerActionsMenu
                        customerId={customer.id}
                        customerName={customer.name}
                        currentStamps={customer.stamps}
                        maxStamps={customer.card.stampsRequired}
                        reward={customer.card.reward}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">
              {customers.length} cliente{customers.length !== 1 ? "s" : ""}
              {activeCard ? ` en "${activeCard.name}"` : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
