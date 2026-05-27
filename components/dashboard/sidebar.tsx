"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  CreditCard,
  Users,
  QrCode,
  Palette,
  Settings,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { logout } from "@/lib/actions/auth"

const navigation = [
  { name: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tarjetas de Lealtad", href: "/dashboard/cards", icon: CreditCard },
  { name: "Clientes", href: "/dashboard/customers", icon: Users },
  { name: "Códigos QR", href: "/dashboard/qr-codes", icon: QrCode },
  { name: "Marca", href: "/dashboard/branding", icon: Palette },
  { name: "Configuración", href: "/dashboard/settings", icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/short-logo.svg"
            alt="Koda"
            width={32}
            height={32}
            className="size-8 shrink-0"
          />
          <span className="font-semibold text-foreground">Koda</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => { if (e.key === "Escape") setMobileOpen(false) }}
          role="dialog"
          aria-modal="true"
          aria-label="Navegación móvil"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 max-w-[calc(100vw-2rem)] bg-card border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
            <Image
              src="/short-logo.svg"
              alt="Koda"
              width={36}
              height={36}
              className="size-9 shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">Koda Fidelity</span>
              <span className="text-xs text-muted-foreground">Plataforma de Lealtad</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-border space-y-2">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-medium text-foreground mb-1">¿Necesitas ayuda?</p>
              <p className="text-xs text-muted-foreground mb-3">
                Revisa nuestros docs o contacta soporte
              </p>
              <Link href="/docs">
                <Button size="sm" variant="secondary" className="w-full text-xs">
                  Ver Documentación
                </Button>
              </Link>
            </div>
            <form action={logout}>
              <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground hover:text-destructive">
                Cerrar Sesión
              </Button>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}
