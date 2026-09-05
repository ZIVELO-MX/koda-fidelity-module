import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/dashboard/stat-card"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { getCardIcon } from "@/lib/card-icons"
import { daysUntilExpiry } from "@/lib/card-utils"
import { inicioDelDia, inicioDelDiaAnterior } from "@/lib/dia-local"
import { Users, Stamp, Gift, Plus, ArrowRight, AlertCircle, Eye, AlertTriangle } from "lucide-react"

const ZONA = "America/Mexico_City"

const HORA = new Intl.DateTimeFormat("es-MX", {
  timeZone: ZONA,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const DIA = new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, day: "numeric", month: "short" })

/** Hora del evento si es de hoy, y su fecha corta si no. */
function cuando(fecha: Date, inicioDeHoy: Date): string {
  return fecha >= inicioDeHoy ? HORA.format(fecha) : DIA.format(fecha)
}

function contraAyer(hoy: number, ayer: number): {
  change: string
  changeType: "positive" | "negative" | "neutral"
} {
  const diferencia = hoy - ayer
  if (diferencia === 0) return { change: "Igual que ayer a esta hora", changeType: "neutral" }
  return {
    change: `${Math.abs(diferencia)} ${diferencia > 0 ? "más" : "menos"} que ayer a esta hora`,
    changeType: diferencia > 0 ? "positive" : "negative",
  }
}

export default async function DashboardPage() {
  // La sesión y el negocio se resuelven fuera del try: redirect() funciona
  // lanzando NEXT_REDIRECT, y el catch de abajo se lo tragaría, pintando un
  // error de carga en vez de mandar al login.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect("/login")
  }

  const userRecord = await prisma.user.findUnique({
    where: { email: user.email },
    select: { businessId: true },
  })

  if (!userRecord) {
    redirect("/login")
  }

  const business = await prisma.business.findUnique({
    where: { id: userRecord.businessId },
    select: { id: true, name: true, nickname: true, brandColor: true, logoUrl: true, iconName: true },
  })

  if (!business) {
    redirect("/login")
  }

  const ahora = new Date()
  const inicioDeHoy = inicioDelDia(ahora)
  const inicioDeAyer = inicioDelDiaAnterior(ahora)
  // Hoy va a medias y ayer está completo, así que ayer se corta a la misma hora
  // del día. Si no, la comparación diría "menos que ayer" toda la mañana.
  const corteDeAyer = new Date(inicioDeAyer.getTime() + (ahora.getTime() - inicioDeHoy.getTime()))

  let loadingError = false
  let cards: any[] = []
  let allLogs: any[] = []
  let logsDelPeriodo: { type: string; createdAt: Date }[] = []
  let altasDelPeriodo: { createdAt: Date }[] = []

  try {
    const [fetchedCards, fetchedLogs, fetchedPeriodo, fetchedAltas] = await Promise.all([
      prisma.loyaltyCard.findMany({
        where: { businessId: business.id, isActive: true },
        include: {
          _count: { select: { customers: { where: { isActive: true } } } },
          customers: { where: { isActive: true }, select: { id: true, name: true, stamps: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.stampLog.findMany({
        where: { customer: { card: { businessId: business.id } } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          customer: { select: { name: true, card: { select: { name: true } } } },
        },
      }),
      prisma.stampLog.findMany({
        where: {
          customer: { card: { businessId: business.id } },
          createdAt: { gte: inicioDeAyer },
        },
        select: { type: true, createdAt: true },
      }),
      prisma.customer.findMany({
        where: { card: { businessId: business.id }, createdAt: { gte: inicioDeAyer } },
        select: { createdAt: true },
      }),
    ])

    cards = fetchedCards
    allLogs = fetchedLogs
    logsDelPeriodo = fetchedPeriodo
    altasDelPeriodo = fetchedAltas
  } catch {
    loadingError = true
  }

  if (loadingError) {
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

  const deHoy = (fecha: Date) => fecha >= inicioDeHoy
  const deAyerALaMismaHora = (fecha: Date) => fecha >= inicioDeAyer && fecha < corteDeAyer

  const contar = (tipo: string, dentro: (fecha: Date) => boolean) =>
    logsDelPeriodo.filter((l) => l.type === tipo && dentro(l.createdAt)).length

  const sellosHoy = contar("stamp", deHoy)
  const canjesHoy = contar("redeem", deHoy)
  const altasHoy = altasDelPeriodo.filter((c) => deHoy(c.createdAt)).length
  const altasAyer = altasDelPeriodo.filter((c) => deAyerALaMismaHora(c.createdAt)).length

  const soonExpiring = cards
    .map((c) => ({ ...c, daysLeft: daysUntilExpiry(c.expiresAt) }))
    .filter((c) => c.daysLeft !== null && c.daysLeft >= 0 && c.daysLeft <= 7)

  const aUnSello = cards.flatMap((card) =>
    (card.customers as any[])
      .filter((cliente) => card.stampsRequired - cliente.stamps === 1)
      .map((cliente) => ({ id: cliente.id, nombre: cliente.name, tarjeta: card.name })),
  )

  const hayAtencion = aUnSello.length > 0 || soonExpiring.length > 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel</h1>
          <p className="text-muted-foreground">¡Bienvenido, {business.nickname ?? business.name}! Esto es lo que está pasando.</p>
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

      {hayAtencion && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-3 min-w-0">
            {aUnSello.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {aUnSello.length === 1
                    ? "Un cliente está a un sello de completar"
                    : `${aUnSello.length} clientes están a un sello de completar`}
                </p>
                <ul className="space-y-0.5">
                  {aUnSello.map((cliente) => (
                    <li key={cliente.id} className="text-sm text-amber-700 dark:text-amber-400">
                      <span className="font-medium">{cliente.nombre}</span>
                      {" — "}
                      {cliente.tarjeta}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {soonExpiring.length > 0 && (
              <div className="space-y-1">
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
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Hoy</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard
            title="Sellos de hoy"
            value={sellosHoy}
            icon={Stamp}
            {...contraAyer(sellosHoy, contar("stamp", deAyerALaMismaHora))}
          />
          <StatCard
            title="Canjes de hoy"
            value={canjesHoy}
            icon={Gift}
            {...contraAyer(canjesHoy, contar("redeem", deAyerALaMismaHora))}
          />
          <StatCard
            title="Clientes nuevos hoy"
            value={altasHoy}
            icon={Users}
            {...contraAyer(altasHoy, altasAyer)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Tendencia de 30 días</h2>
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6">
          <p className="text-sm text-muted-foreground">
            Todavía no se puede mostrar. Con los datos que hoy entrega el servidor solo se pueden
            contar los eventos del día; la serie diaria llega cuando el backend la publique. Queda
            vacía a propósito, antes que dibujar una tendencia inventada.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
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
                      if (card.iconName === "logo" && business.logoUrl) {
                        return (
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                            style={{ backgroundColor: card.brandColor }}
                          >
                            <img src={business.logoUrl} alt="" className="w-6 h-6 object-contain" />
                          </div>
                        )
                      }
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
                      <span className="font-medium text-foreground">{(card.customers as any[]).reduce((s: number, c: any) => s + c.stamps, 0)}</span> sellos
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
          <div className="bg-card rounded-2xl border border-border px-4">
            {allLogs.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6">
                Aún no hay actividad. Crea una tarjeta y comparte el código QR.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {allLogs.map((log) => (
                  <li key={log.id} className="flex items-center gap-3 py-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        log.type === "stamp" ? "bg-primary/10 text-primary" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {log.type === "stamp" ? <Stamp className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{log.customer.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {log.type === "stamp" ? "Recibió un sello" : "Canjeó su recompensa"}
                        {" · "}
                        {log.customer.card.name}
                      </p>
                    </div>
                    <time
                      dateTime={log.createdAt.toISOString()}
                      className="font-mono tabular-nums text-xs text-muted-foreground shrink-0"
                    >
                      {cuando(log.createdAt, inicioDeHoy)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: link to docs */}
      <div className="lg:hidden">
        <Link
          href="/dashboard/docs"
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
}
