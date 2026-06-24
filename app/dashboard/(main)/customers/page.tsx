import Link from "next/link"
import { redirect } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { CustomersTable, SortField, SortOrder } from "@/components/dashboard/customers-table"

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
        card: { select: { name: true, stampsRequired: true, reward: true, brandColor: true } },
        _count: { select: { stampsLog: { where: { type: "redeem" } }, milestoneClaims: true } },
      },
      orderBy: { [sort]: order },
    }),
  ])

  const baseParams = new URLSearchParams({
    ...(q ? { q } : {}),
    ...(cardFilter ? { card: cardFilter } : {}),
  })

  const activeCard = loyaltyCards.find((c) => c.id === cardFilter)

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Clientes</h1>
          <p className="text-muted-foreground">Consulta y gestiona los miembros de tu programa de lealtad</p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/dashboard/cards">Ver tarjetas</Link>
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <form method="GET">
              <Input
                name="q"
                placeholder="Buscar clientes…"
                className="pl-10"
                defaultValue={q ?? ""}
                autoComplete="off"
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

        {loyaltyCards.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Link
              href={`/dashboard/customers?${new URLSearchParams({ ...(q ? { q } : {}), ...(sortParam ? { sort: sortParam } : {}), ...(orderParam ? { order: orderParam } : {}) }).toString()}`}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
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
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
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
        <CustomersTable
          customers={customers}
          sort={sort}
          order={order}
          basePath="/dashboard/customers"
          baseParams={baseParams}
          footerSuffix={activeCard ? ` en "${activeCard.name}"` : ""}
        />
      )}
    </div>
  )
}
