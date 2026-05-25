import Link from "next/link"
import { redirect } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MoreVertical, Stamp, Gift, Calendar } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"

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

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect("/login")
  }

  const business = await prisma.business.findUnique({
    where: { email: user.email },
  })

  if (!business) {
    redirect("/login")
  }

  const customers = await prisma.customer.findMany({
    where: { card: { businessId: business.id } },
    include: {
      card: { select: { name: true, stampsRequired: true, reward: true } },
      _count: { select: { stampsLog: { where: { type: "redeem" } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground">Consulta y gestiona los miembros de tu programa de lealtad</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            className="pl-10"
          />
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-20">
          <h3 className="text-lg font-semibold text-foreground mb-2">Aún no tienes clientes</h3>
          <p className="text-muted-foreground mb-6">Los clientes se registrarán al unirse a tus tarjetas</p>
          <Link href="/dashboard/cards">
            <Button variant="outline">Ver tarjetas</Button>
          </Link>
        </div>
      ) : (
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
                    Registro
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
                        </div>
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
                              style={{ width: `${(customer.stamps / customer.card.stampsRequired) * 100}%` }}
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
      )}
    </div>
  )
}
