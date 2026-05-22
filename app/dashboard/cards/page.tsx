import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, MoreVertical, QrCode, Users, Stamp } from "lucide-react"

const cards = [
  {
    id: "1",
    name: "Coffee Rewards",
    description: "Buy 9 coffees, get 1 free",
    maxStamps: 10,
    reward: "Free Coffee",
    color: "#f97316",
    customers: 142,
    totalStamps: 856,
    status: "active",
    createdAt: "Jan 15, 2026",
  },
  {
    id: "2",
    name: "Lunch Special",
    description: "Collect stamps with every lunch",
    maxStamps: 8,
    reward: "Free Dessert",
    color: "#3b82f6",
    customers: 67,
    totalStamps: 234,
    status: "active",
    createdAt: "Feb 1, 2026",
  },
]

export default function CardsPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tarjetas de Lealtad</h1>
          <p className="text-muted-foreground">Gestiona tus campañas de tarjetas de lealtad digitales</p>
        </div>
        <Link href="/dashboard/cards/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Crear Tarjeta
          </Button>
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.id}
            className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow group"
          >
            {/* Card Header with Color */}
            <div
              className="h-3"
              style={{ backgroundColor: card.color }}
            />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: card.color }}
                >
                  {card.name.charAt(0)}
                </div>
                <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    card.status === "active" 
                      ? "bg-green-100 text-green-700" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {card.status === "active" ? "Activa" : "Pausada"}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <h3 className="font-semibold text-lg text-foreground mb-1">{card.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{card.description}</p>

              <div className="bg-muted/50 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Recompensa</span>
                  <span className="font-medium text-foreground">{card.reward}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Sellos requeridos</span>
                  <span className="font-medium text-foreground">{card.maxStamps}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-sm font-semibold text-foreground">{card.customers}</p>
                  <p className="text-xs text-muted-foreground">Clientes</p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <Stamp className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-sm font-semibold text-foreground">{card.totalStamps}</p>
                  <p className="text-xs text-muted-foreground">Sellos</p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <QrCode className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-sm font-semibold text-foreground">1</p>
                  <p className="text-xs text-muted-foreground">Código QR</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link href={`/dashboard/cards/${card.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    Ver Detalles
                  </Button>
                </Link>
                <Link href="/dashboard/qr-codes">
                  <Button variant="ghost" size="icon">
                    <QrCode className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Create New Card */}
        <Link
          href="/dashboard/cards/new"
          className="bg-muted/30 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all flex flex-col items-center justify-center text-center p-8 min-h-[400px]"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg text-foreground mb-2">Crear Nueva Tarjeta</h3>
          <p className="text-sm text-muted-foreground max-w-[200px]">
            Inicia una nueva campaña de lealtad y atrae a tus clientes
          </p>
        </Link>
      </div>
    </div>
  )
}
