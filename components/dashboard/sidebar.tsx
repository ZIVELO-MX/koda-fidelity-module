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
  BookOpen,
  Smartphone,
  LogOut,
  UserCog,
  Camera,
  Menu,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { logout } from "@/lib/actions/auth"
import { MobileSettingsPanel } from "./mobile-settings-panel"
import { useState } from "react"
import type { Role } from "@prisma/client"

interface DashboardSidebarProps {
  userEmail: string
  businessName: string
  brandColor: string
  nickname?: string
  role: Role
}

const navGroups = [
  {
    label: "Gestión",
    roles: ["admin", "sellador"] as Role[],
    items: [
      { name: "Tarjetas de Lealtad", href: "/dashboard/cards", icon: CreditCard },
      { name: "Clientes", href: "/dashboard/customers", icon: Users },
      { name: "Códigos QR", href: "/dashboard/qr-codes", icon: QrCode },
    ],
  },
  {
    label: "Administración",
    roles: ["admin"] as Role[],
    items: [
      { name: "Marca", href: "/dashboard/branding", icon: Palette },
      { name: "Configuración", href: "/dashboard/settings", icon: Settings },
      { name: "Equipo", href: "/dashboard/team", icon: UserCog },
      { name: "Documentación", href: "/dashboard/docs", icon: BookOpen },
    ],
  },
]

// hrefs already covered by the 4 fixed bottom-nav tabs (Panel, Tarjetas, Escáner, Clientes)
const BOTTOM_NAV_HREFS = new Set([
  "/dashboard",
  "/dashboard/cards",
  "/dashboard/scan",
  "/dashboard/customers",
])

export function DashboardSidebar({ userEmail, businessName, brandColor, nickname, role }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Gestión: true,
    Administración: true,
  })

  const visibleGroups = navGroups.filter((g) => g.roles.includes(role))

  // Mobile "Menú" panel: complete navigation map with all destinations visible.
  // BOTTOM_NAV_HREFS is kept only to avoid lighting up "Menú" while a bottom-tab is active.
  const moreNavGroups = [
    {
      label: "General",
      items: [{ name: "Panel", href: "/dashboard", icon: LayoutDashboard }],
    },
    ...navGroups
      .filter((g) => g.roles.includes(role))
      .map((g) => ({
        label: g.label,
        items:
          g.label === "Gestión"
            ? [...g.items, { name: "Escáner", href: "/dashboard/scan", icon: Camera }]
            : [...g.items],
      })),
  ]

  const isScanActive = pathname === "/dashboard/scan"
  const isMenuActive = moreNavGroups.some((g) =>
    g.items.some(
      (item) => !BOTTOM_NAV_HREFS.has(item.href) && pathname.startsWith(item.href),
    ),
  )

  const mobileMainItems = [
    { name: "Panel", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tarjetas", href: "/dashboard/cards", icon: CreditCard },
    { name: "Clientes", href: "/dashboard/customers", icon: Users },
  ]

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-full w-64 max-w-[calc(100vw-2rem)] bg-card border-r border-border flex-col">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
          <Image src="/short-logo.svg" alt="Koda" width={36} height={36} className="size-9 shrink-0" />
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">Koda Fidelity</span>
            <span className="text-xs text-muted-foreground">Plataforma de Lealtad</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Panel — standalone */}
          {(() => {
            const isActive = pathname === "/dashboard"
            return (
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
                Panel
              </Link>
            )
          })()}

          {/* Grouped sections */}
          {visibleGroups.map((group) => (
            <Collapsible
              key={group.label}
              open={openGroups[group.label]}
              onOpenChange={() => toggleGroup(group.label)}
              className="mt-2"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                {group.label}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    openGroups[group.label] ? "rotate-0" : "-rotate-90"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-0.5">
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
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
              </CollapsibleContent>
            </Collapsible>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          {role === "sellador" && (
            <div className="px-3 py-1.5 mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                <UserCog className="h-3 w-3" />
                Sellador
              </span>
            </div>
          )}
          <Link
            href="/dashboard/my-cards"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Smartphone className="h-5 w-5" />
            Mis Tarjetas
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start gap-3 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="h-5 w-5" />
            Cerrar Sesión
          </Button>

          <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cerrar sesión</AlertDialogTitle>
                <AlertDialogDescription>¿Estás seguro de que deseas cerrar sesión?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => await logout()}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Cerrar sesión
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </aside>

      {/* Mobile bottom navbar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-end justify-around h-16 px-2">
          {/* Panel, Tarjetas */}
          {mobileMainItems.slice(0, 2).map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 min-w-0 px-2 py-1 rounded-lg transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight truncate w-full text-center">
                  {item.name}
                </span>
              </Link>
            )
          })}

          {/* Center: Escáner FAB */}
          <Link
            href="/dashboard/scan"
            className="flex flex-col items-center gap-0.5 -mt-4 pb-1"
            aria-label="Abrir escáner"
          >
            <div
              className={cn(
                "h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all",
                isScanActive
                  ? "bg-primary scale-105 shadow-primary/40"
                  : "bg-primary/90 hover:bg-primary shadow-primary/20"
              )}
            >
              <Camera className="h-6 w-6 text-primary-foreground" />
            </div>
            <span
              className={cn(
                "text-[10px] font-medium leading-tight",
                isScanActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              Escáner
            </span>
          </Link>

          {/* Clientes */}
          {mobileMainItems.slice(2).map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 min-w-0 px-2 py-1 rounded-lg transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight truncate w-full text-center">
                  {item.name}
                </span>
              </Link>
            )
          })}

          {/* Menú button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-0 px-2 py-1 rounded-lg transition-colors",
              isMenuActive ? "text-primary" : "text-muted-foreground"
            )}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight truncate w-full text-center">Menú</span>
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      {moreOpen && (
        <MobileSettingsPanel
          userEmail={userEmail}
          businessName={businessName}
          brandColor={brandColor}
          role={role}
          navGroups={moreNavGroups}
          onClose={() => setMoreOpen(false)}
        />
      )}
    </>
  )
}
