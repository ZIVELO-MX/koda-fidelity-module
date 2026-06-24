import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CustomerActionsMenu } from "@/components/dashboard/customer-actions-menu"
import { Gift, Calendar, Stamp, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"

export type SortField = "name" | "stamps" | "createdAt"
export type SortOrder = "asc" | "desc"

export interface TableCustomer {
  id: string
  name: string
  stamps: number
  createdAt: Date
  card: {
    name: string
    stampsRequired: number
    reward: string
    brandColor: string
  }
  _count: {
    stampsLog: number
    milestoneClaims?: number
  }
}

export interface CustomersTableProps {
  customers: TableCustomer[]
  sort: SortField
  order: SortOrder
  basePath: string
  baseParams: URLSearchParams
  showCardColumn?: boolean
  footerSuffix?: string
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "hace unos segundos"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

export function buildSortLink(
  field: SortField,
  currentSort: SortField,
  currentOrder: SortOrder,
  base: URLSearchParams,
  basePath: string,
): string {
  const p = new URLSearchParams(base)
  p.set("sort", field)
  p.set("order", currentSort === field && currentOrder === "asc" ? "desc" : "asc")
  return `${basePath}?${p.toString()}`
}

function SortIcon({ field, currentSort, currentOrder }: { field: SortField; currentSort: SortField; currentOrder: SortOrder }) {
  if (field !== currentSort) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40 shrink-0" aria-hidden="true" />
  return currentOrder === "asc"
    ? <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    : <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
}

export function CustomersTable({
  customers,
  sort,
  order,
  basePath,
  baseParams,
  showCardColumn = true,
  footerSuffix = "",
}: CustomersTableProps) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                <Link
                  href={buildSortLink("name", sort, order, baseParams, basePath)}
                  className="inline-flex items-center gap-1 transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  Cliente
                  <SortIcon field="name" currentSort={sort} currentOrder={order} />
                </Link>
              </th>
              {showCardColumn && (
                <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                  Tarjeta
                </th>
              )}
              <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                <Link
                  href={buildSortLink("stamps", sort, order, baseParams, basePath)}
                  className="inline-flex items-center gap-1 transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  Progreso
                  <SortIcon field="stamps" currentSort={sort} currentOrder={order} />
                </Link>
              </th>
              <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                <Link
                  href={buildSortLink("createdAt", sort, order, baseParams, basePath)}
                  className="inline-flex items-center gap-1 transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  Registro
                  <SortIcon field="createdAt" currentSort={sort} currentOrder={order} />
                </Link>
              </th>
              <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                Canjes
              </th>
              <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                Bonos
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
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {customer.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="min-w-0 max-w-[14rem] truncate font-medium text-foreground">{customer.name}</p>
                  </div>
                </td>
                {showCardColumn && (
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      <span className="inline-block max-w-[10rem] truncate align-bottom">{customer.card.name}</span>
                    </span>
                  </td>
                )}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-[80px] max-w-[120px]">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-[width]"
                          style={{ width: `${Math.min((customer.stamps / customer.card.stampsRequired) * 100, 100)}%` }}
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
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    {timeAgo(customer.createdAt)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Stamp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm text-foreground">{customer._count.stampsLog}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {customer._count.milestoneClaims ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded-full">
                      {customer._count.milestoneClaims}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <CustomerActionsMenu
                    customerId={customer.id}
                    customerName={customer.name}
                    currentStamps={customer.stamps}
                    maxStamps={customer.card.stampsRequired}
                    reward={customer.card.reward}
                    brandColor={customer.card.brandColor}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-border bg-muted/10">
        <p className="text-xs text-muted-foreground">
          {customers.length} cliente{customers.length !== 1 ? "s" : ""}{footerSuffix}
        </p>
      </div>
    </div>
  )
}
