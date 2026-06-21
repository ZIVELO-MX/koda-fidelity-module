import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Gift, Users, Stamp, Calendar, Search, AlertTriangle } from "lucide-react"
import { CardActions } from "@/components/dashboard/card-actions"
import { CardQRInline } from "@/components/dashboard/card-qr-inline"
import { CustomersTable, SortField, SortOrder } from "@/components/dashboard/customers-table"
import { getCardIcon } from "@/lib/card-icons"
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

  const business = await prisma.business.findUnique({ where: { email: user.email } })
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
        <ArrowLeft className="h-4 w-4" />
        Volver a tarjetas
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {(() => {
            const icon = getCardIcon(card.iconName)
            const IconComp = icon?.Icon
            if (card.iconName === "logo" && business.logoUrl) {
              return (
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0"
                  style={{ backgroundColor: card.brandColor }}
                >
                  <img src={business.logoUrl} alt="" className="w-9 h-9 object-contain" />
                </div>
              )
            }
            return (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0"
                style={{ backgroundColor: card.brandColor }}
              >
                {IconComp ? <IconComp className="h-7 w-7" /> : card.name.charAt(0)}
              </div>
            )
          })()}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{card.name}</h1>
              {cardExpired && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-destructive/10 text-destructive">
                  Vencida
                </span>
              )}
            </div>
            <p className="text-muted-foreground">{card.stampsRequired} sellos para {card.reward}</p>
          </div>
        </div>
        <CardActions
          cardId={card.id}
          businessName={business.name}
          businessLogo={business.logoUrl}
          maxStamps={card.stampsRequired}
          initialName={card.name}
          initialReward={card.reward}
          initialColor={card.brandColor}
          initialIcon={card.iconName}
          initialStampIcon={card.stampIconName}
          initialDescription={card.description}
          initialMilestones={card.milestoneRewards}
        />
      </div>

      {card.description && (
        <p className="text-muted-foreground">{card.description}</p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <Users className="h-5 w-5 text-muted-foreground mb-2" />
          <p className="text-2xl font-bold text-foreground">{card._count.customers}</p>
          <p className="text-sm text-muted-foreground">Clientes</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <Stamp className="h-5 w-5 text-muted-foreground mb-2" />
          <p className="text-2xl font-bold text-foreground">{totalStamps}</p>
          <p className="text-sm text-muted-foreground">Sellos totales</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <Gift className="h-5 w-5 text-muted-foreground mb-2" />
          <p className="text-2xl font-bold text-foreground">{readyToRedeem}</p>
          <p className="text-sm text-muted-foreground">Listos para canjear</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <Calendar className="h-5 w-5 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">
            {card.expiresAt ? card.expiresAt.toLocaleDateString("es-MX") : "Sin vencimiento"}
          </p>
          <p className="text-sm text-muted-foreground">Vencimiento</p>
        </div>
      </div>

      <CardQRInline cardId={card.id} brandColor={card.brandColor} />

      {cardExpired && incompleteCustomers > 0 && (
        <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Esta tarjeta ya venció</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {incompleteCustomers} cliente{incompleteCustomers !== 1 ? "s" : ""} no {incompleteCustomers !== 1 ? "completaron" : "completó"} los {card.stampsRequired} sellos necesarios para obtener su recompensa.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <form method="GET">
              <Input
                name="q"
                placeholder="Buscar clientes..."
                defaultValue={q || ""}
                className="pl-10"
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
