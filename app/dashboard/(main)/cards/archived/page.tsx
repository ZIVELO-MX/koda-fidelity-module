import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, ArchiveRestore, Trash2, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
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
              className="overflow-hidden rounded-2xl border border-border bg-card opacity-75 transition-opacity hover:opacity-100"
            >
              {/* La misma tarjeta que en el listado activo, en gris: archivar no
                  la borra, y quien la busca la reconoce por su diseño. */}
              <div className="p-5 grayscale">
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
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Archivada
                  </span>
                </div>

                <p className="truncate text-sm text-muted-foreground">{card.reward}</p>

                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{card._count.customers}</span>{" "}
                  cliente{card._count.customers !== 1 ? "s" : ""} conserva
                  {card._count.customers !== 1 ? "n" : ""} su progreso
                </p>

                <RestoreCardButton cardId={card.id} cardName={card.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
