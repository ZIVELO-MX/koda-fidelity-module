import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter, MoreVertical, Stamp, Gift, Calendar } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const customers = [
  {
    id: "1",
    name: "Sarah Mitchell",
    email: "sarah.m@email.com",
    card: "Coffee Rewards",
    stamps: 7,
    maxStamps: 10,
    joinedAt: "Jan 20, 2026",
    lastVisit: "Today",
    redemptions: 2,
  },
  {
    id: "2",
    name: "John Davidson",
    email: "john.d@email.com",
    card: "Coffee Rewards",
    stamps: 10,
    maxStamps: 10,
    joinedAt: "Feb 5, 2026",
    lastVisit: "Yesterday",
    redemptions: 3,
  },
  {
    id: "3",
    name: "Emma Wilson",
    email: "emma.w@email.com",
    card: "Lunch Special",
    stamps: 3,
    maxStamps: 8,
    joinedAt: "Mar 1, 2026",
    lastVisit: "2 days ago",
    redemptions: 0,
  },
  {
    id: "4",
    name: "Mike Roberts",
    email: "mike.r@email.com",
    card: "Coffee Rewards",
    stamps: 5,
    maxStamps: 10,
    joinedAt: "Mar 10, 2026",
    lastVisit: "Today",
    redemptions: 1,
  },
  {
    id: "5",
    name: "Lisa Chen",
    email: "lisa.c@email.com",
    card: "Lunch Special",
    stamps: 6,
    maxStamps: 8,
    joinedAt: "Feb 15, 2026",
    lastVisit: "3 days ago",
    redemptions: 1,
  },
]

export default function CustomersPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground">Consulta y gestiona los miembros de tu programa de lealtad</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtrar
        </Button>
      </div>

      {/* Customers Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                  Cliente
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                  Tarjeta
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                  Progreso
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                  Última Visita
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
                      <div>
                        <p className="font-medium text-foreground">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {customer.card}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-[120px]">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(customer.stamps / customer.maxStamps) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {customer.stamps}/{customer.maxStamps}
                      </span>
                      {customer.stamps >= customer.maxStamps && (
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
                      {customer.lastVisit}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Stamp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{customer.redemptions}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
