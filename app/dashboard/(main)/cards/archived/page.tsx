import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, ArchiveRestore, Trash2, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { getCardIcon } from "@/lib/card-icons"
import { RestoreCardButton } from "@/components/dashboard/restore-card-button"

export default async function ArchivedCardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) redirect("/login")

  const business = await prisma.business.findUnique({ where: { email: user.email } })
  if (!business) redirect("/login")

  const cards = await prisma.loyaltyCard.findMany({
    where: { businessId: business.id, isActive: false },
    include: {
      _count: { select: { customers: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/cards">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Archive className="h-6 w-6 text-muted-foreground" />
            Tarjetas Archivadas
          </h1>
          <p className="text-muted-foreground">
            {cards.length === 0
              ? "No hay tarjetas archivadas"
              : `${cards.length} tarjeta${cards.length !== 1 ? "s" : ""} archivada${cards.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-20">
          <Archive className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Sin tarjetas archivadas</h3>
          <p className="text-muted-foreground mb-6">
            Las tarjetas que archives aparecerán aquí. Podrás restaurarlas en cualquier momento.
          </p>
          <Link href="/dashboard/cards">
            <Button variant="outline">Ver tarjetas activas</Button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-card rounded-2xl border border-border overflow-hidden opacity-75 hover:opacity-100 transition-opacity"
            >
              <div className="h-3 bg-muted" />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  {(() => {
                    const icon = getCardIcon(card.iconName)
                    const IconComp = icon?.Icon
                    if (card.iconName === "logo" && business.logoUrl) {
                      return (
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 grayscale"
                          style={{ backgroundColor: card.brandColor }}
                        >
                          <img src={business.logoUrl} alt="" className="w-8 h-8 object-contain" />
                        </div>
                      )
                    }
                    return (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 grayscale"
                        style={{ backgroundColor: card.brandColor }}
                      >
                        {IconComp ? <IconComp className="h-6 w-6" /> : card.name.charAt(0)}
                      </div>
                    )
                  })()}
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                    Archivada
                  </span>
                </div>

                <h3 className="font-semibold text-lg text-foreground mb-1">{card.name}</h3>
                {card.description && (
                  <p className="text-sm text-muted-foreground mb-4">{card.description}</p>
                )}

                <div className="bg-muted/50 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Recompensa</span>
                    <span className="font-medium text-foreground">{card.reward}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Sellos requeridos</span>
                    <span className="font-medium text-foreground">{card.stampsRequired}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Clientes (total)</span>
                    <span className="font-medium text-foreground">{card._count.customers}</span>
                  </div>
                </div>

                <RestoreCardButton cardId={card.id} cardName={card.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
