import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Gift, Users, Stamp, Calendar } from "lucide-react"
import { CardActions } from "@/components/dashboard/card-actions"

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

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) redirect("/login")

  const business = await prisma.business.findUnique({ where: { email: user.email } })
  if (!business) redirect("/login")

  const card = await prisma.loyaltyCard.findUnique({
    where: { id },
    include: {
      _count: { select: { customers: true } },
      customers: {
        include: {
          _count: { select: { stampsLog: { where: { type: "redeem" } } } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!card || card.businessId !== business.id) {
    redirect("/dashboard/cards")
  }

  const totalStamps = card.customers.reduce((s, c) => s + c.stamps, 0)
  const readyToRedeem = card.customers.filter((c) => c.stamps >= card.stampsRequired).length

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
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: card.brandColor }}
          >
            {card.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{card.name}</h1>
            <p className="text-muted-foreground">{card.stampsRequired} sellos para {card.reward}</p>
          </div>
        </div>
        <CardActions cardId={card.id} />
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

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <h2 className="font-semibold text-foreground">Clientes ({card.customers.length})</h2>
        </div>
        {card.customers.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Aún no hay clientes en esta tarjeta. Comparte el código QR para que se unan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">Cliente</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">Progreso</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">Canjes</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-3">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {card.customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-muted/30">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {customer.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3 max-w-[180px]">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(100, (customer.stamps / card.stampsRequired) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {customer.stamps}/{card.stampsRequired}
                        </span>
                        {customer.stamps >= card.stampsRequired && (
                          <Gift className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-foreground">{customer._count.stampsLog}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-muted-foreground">{timeAgo(customer.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
