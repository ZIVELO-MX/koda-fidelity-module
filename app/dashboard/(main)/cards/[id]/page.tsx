import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Search, AlertTriangle } from "lucide-react"
import { CardActions } from "@/components/dashboard/card-actions"
import { CardQRInline } from "@/components/dashboard/card-qr-inline"
import { CustomersTable, SortField, SortOrder } from "@/components/dashboard/customers-table"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { isExpired } from "@/lib/card-utils"

export default async function CardDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string; sort?: string; order?: string }>
}) {
  const { id } = await params
  const { q, sort: sortParam, order: orderParam } = await searchParams

  const sort: SortField = (["name", "stamps", "createdAt"].includes(sortParam ?? "") ? sortParam : "createdAt") as SortField
  const order: SortOrder = orderParam === "asc" ? "asc" : "desc"

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) redirect("/login")

  const business = await prisma.business.findFirst({ where: { users: { some: { authUserId: user.id } } } })
  if (!business) redirect("/login")

  const card = await prisma.loyaltyCard.findUnique({
    where: { id },
    include: {
      _count: { select: { customers: { where: { isActive: true } } } },
      milestoneRewards: { orderBy: { stampNumber: "asc" } },
      customers: {
        where: { isActive: true },
        include: {
              _count: {
                select: {
                  stampsLog: { where: { type: "redeem" } },
                  milestoneClaims: true,
                },
              },
        },
        orderBy: { [sort]: order },
      },
    },
  })

  if (!card || card.businessId !== business.id) {
    redirect("/dashboard/cards")
  }

  const cardExpired = isExpired(card.expiresAt)
  const allCustomers = card.customers
  const totalStamps = allCustomers.reduce((s, c) => s + c.stamps, 0)
  const readyToRedeem = allCustomers.filter((c) => c.stamps >= card.stampsRequired).length
  const incompleteCustomers = cardExpired
    ? allCustomers.filter((c) => c.stamps < card.stampsRequired).length
    : 0

  const filteredCustomers = q?.trim()
    ? allCustomers.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()))
    : allCustomers

  const tableCustomers = filteredCustomers.map((c) => ({
    ...c,
    card: { name: card.name, stampsRequired: card.stampsRequired, reward: card.reward, brandColor: card.brandColor },
  }))

  const basePath = `/dashboard/cards/${id}`
  const baseParams = new URLSearchParams({ ...(q ? { q } : {}) })

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/cards"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a tarjetas
      </Link>

      {/* La tarjeta encabeza su propio detalle. Antes iba un cuadro de color
          con la inicial, y la tarjeta real no aparecía por ninguna parte. */}
      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
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
          expirationDate={card.expiresAt ? card.expiresAt.toLocaleDateString("es-MX") : undefined}
          brandColor={card.brandColor}
        />

        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="min-w-0 break-words text-2xl font-bold text-foreground text-balance">
                  {card.name}
                </h1>
                {cardExpired && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    Vencida
                  </span>
                )}
              </div>
              <p className="break-words text-muted-foreground">
                {card.stampsRequired} sellos para {card.reward}
              </p>
            </div>
            {/* Editar, códigos, archivar y eliminar viven aquí, como acciones
                secundarias detrás de un menú. */}
            <CardActions cardId={card.id} cardName={card.name} />
          </div>

          {card.description && (
            <p className="break-words text-sm text-muted-foreground">{card.description}</p>
          )}

          {/* Una línea de cifras, no cuatro cajas del mismo tamaño que competían
              entre ellas y con la tarjeta. */}
          <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4">
            <div>
              <dt className="text-xs text-muted-foreground">Clientes</dt>
              <dd className="text-lg font-semibold tabular-nums text-foreground">
                {card._count.customers}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Sellos</dt>
              <dd className="text-lg font-semibold tabular-nums text-foreground">{totalStamps}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Listos para canjear</dt>
              <dd className="text-lg font-semibold tabular-nums text-foreground">{readyToRedeem}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Vencimiento</dt>
              <dd className="text-lg font-semibold text-foreground">
                {card.expiresAt ? card.expiresAt.toLocaleDateString("es-MX") : "Sin vencimiento"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <CardQRInline cardId={card.id} brandColor={card.brandColor} />

      {cardExpired && incompleteCustomers > 0 && (
        <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-destructive">Esta tarjeta ya venció</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {incompleteCustomers} cliente{incompleteCustomers !== 1 ? "s" : ""} no {incompleteCustomers !== 1 ? "completaron" : "completó"} los {card.stampsRequired} sellos necesarios para obtener su recompensa.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <form method="GET">
              <Input
                name="q"
                placeholder="Buscar clientes…"
                defaultValue={q || ""}
                className="pl-10"
                autoComplete="off"
              />
              {sortParam && <input type="hidden" name="sort" value={sortParam} />}
              {orderParam && <input type="hidden" name="order" value={orderParam} />}
            </form>
          </div>
          {q?.trim() && (
            <Link
              href={basePath}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Limpiar filtro
            </Link>
          )}
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
            {q?.trim()
              ? "No se encontraron clientes con ese nombre."
              : "Aún no hay clientes en esta tarjeta. Comparte el código QR para que se unan."}
          </div>
        ) : (
          <CustomersTable
            customers={tableCustomers}
            sort={sort}
            order={order}
            basePath={basePath}
            baseParams={baseParams}
            showCardColumn={false}
          />
        )}
      </div>
    </div>
  )
}
