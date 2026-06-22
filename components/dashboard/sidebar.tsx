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
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import { useEffect, useRef, useState } from "react"
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

const SIDEBAR_STATE_KEY = "dashboard-sidebar-state"
const SIDEBAR_GROUPS_STORAGE_KEY = "dashboard-sidebar-groups"
const DEFAULT_OPEN_GROUPS: Record<string, boolean> = {
  Gestión: true,
  Administración: true,
}

export function DashboardSidebar({ userEmail, businessName, brandColor, nickname, role }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>(["Gestión", "Administración"])
  const prefsLoaded = useRef(false)

  useEffect(() => {
    const rawCollapsed = window.localStorage.getItem(SIDEBAR_STATE_KEY)
    if (rawCollapsed === "true") {
      setSidebarCollapsed(true)
      document.documentElement.classList.add("sidebar-collapsed")
    }

    const rawGroups = window.localStorage.getItem(SIDEBAR_GROUPS_STORAGE_KEY)
    if (rawGroups) {
      try {
        const parsedValue = JSON.parse(rawGroups) as string[]
        setOpenGroups(Array.isArray(parsedValue) ? parsedValue : ["Gestión", "Administración"])
      } catch {
        window.localStorage.removeItem(SIDEBAR_GROUPS_STORAGE_KEY)
      }
    }
    prefsLoaded.current = true
  }, [])

  useEffect(() => {
    if (!prefsLoaded.current) return
    window.localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(sidebarCollapsed))
    document.documentElement.classList.toggle("sidebar-collapsed", sidebarCollapsed)
  }, [sidebarCollapsed])

  useEffect(() => {
    if (!prefsLoaded.current) return
    window.localStorage.setItem(SIDEBAR_GROUPS_STORAGE_KEY, JSON.stringify(openGroups))
  }, [openGroups])

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

  function toggleGroup(value: string) {
    setOpenGroups((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex fixed top-0 left-0 z-40 h-full bg-card border-r border-border flex-col transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64 max-w-[calc(100vw-2rem)]",
        )}
      >
        <div className={cn(
          "flex items-center border-b border-border shrink-0",
          sidebarCollapsed ? "justify-center px-0 py-5" : "gap-2 px-6 py-5",
        )}>
          <Image src="/short-logo.svg" alt="Koda" width={36} height={36} className="size-9 shrink-0" />
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">Koda Fidelity</span>
              <span className="text-xs text-muted-foreground">Plataforma de Lealtad</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto">
          {/* Panel — standalone */}
          {(() => {
            const isActive = pathname === "/dashboard"
            return (
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors mx-2 my-1",
                  sidebarCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                title={sidebarCollapsed ? "Panel" : undefined}
              >
                <LayoutDashboard className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                {!sidebarCollapsed && <>Panel</>}
              </Link>
            )
          })()}

          {/* Grouped sections with Accordion */}
          {!sidebarCollapsed && (
            <Accordion
              type="multiple"
              value={openGroups}
              onValueChange={(value) => setOpenGroups(value)}
              className="px-2"
            >
              {visibleGroups.map((group) => (
                <AccordionItem key={group.label} value={group.label} className="border-b-0">
                  <AccordionTrigger className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:no-underline">
                    {group.label}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-0.5 pb-1">
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
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                            {item.name}
                          </Link>
                        )
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          {/* Collapsed: show icons only */}
          {sidebarCollapsed && (
            <div className="flex flex-col items-center gap-1 px-2 pt-2">
              {visibleGroups.map((group) =>
                group.items.map((item) => {
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-center p-2 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      title={item.name}
                    >
                      <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                    </Link>
                  )
                }),
              )}
            </div>
          )}
        </nav>

        <div className={cn(
          "border-t border-border space-y-1",
          sidebarCollapsed ? "flex flex-col items-center p-2" : "p-4",
        )}>
          {role === "sellador" && (
            <div className={sidebarCollapsed ? "" : "px-3 py-1.5 mb-1"}>
              <span className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted rounded-full",
                sidebarCollapsed ? "px-1.5 py-0.5" : "px-2 py-0.5",
              )}>
                <UserCog className="h-3 w-3" />
                {!sidebarCollapsed && <>Sellador</>}
              </span>
            </div>
          )}
          <Link
            href="/dashboard/my-cards"
            className={cn(
              "flex items-center rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
              sidebarCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2 text-sm font-medium",
            )}
            title={sidebarCollapsed ? "Mis Tarjetas" : undefined}
          >
            <Smartphone className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <>Mis Tarjetas</>}
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "text-muted-foreground hover:text-destructive",
              sidebarCollapsed ? "justify-center p-2 w-auto" : "w-full justify-start gap-3 text-xs",
            )}
            onClick={() => setLogoutOpen(true)}
            title={sidebarCollapsed ? "Cerrar Sesión" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <>Cerrar Sesión</>}
          </Button>

          {/* Sidebar collapse toggle */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className={cn(
              "flex items-center justify-center rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
              sidebarCollapsed ? "p-2 w-full" : "w-full gap-3 px-3 py-2 text-xs font-medium",
            )}
            title={sidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-5 w-5 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5 shrink-0" />
                Colapsar
              </>
            )}
          </button>

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
                className="flex flex-col items-center justify-center gap-0.5 min-w-0 px-2 py-1 rounded-lg transition-colors"
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-[10px] font-medium leading-tight truncate w-full text-center", isActive ? "text-primary" : "text-muted-foreground")}>
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
                className="flex flex-col items-center justify-center gap-0.5 min-w-0 px-2 py-1 rounded-lg transition-colors"
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-[10px] font-medium leading-tight truncate w-full text-center", isActive ? "text-primary" : "text-muted-foreground")}>
                  {item.name}
                </span>
              </Link>
            )
          })}

          {/* Menú button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 min-w-0 px-2 py-1 rounded-lg transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className={cn("h-5 w-5", isMenuActive ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-[10px] font-medium leading-tight truncate w-full text-center", isMenuActive ? "text-primary" : "text-muted-foreground")}>Menú</span>
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
