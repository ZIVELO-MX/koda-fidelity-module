"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
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
  collapsed: boolean
  onToggleCollapse: () => void
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

const BOTTOM_NAV_HREFS = new Set([
  "/dashboard",
  "/dashboard/cards",
  "/dashboard/scan",
  "/dashboard/customers",
])

const SIDEBAR_GROUPS_STORAGE_KEY = "dashboard-sidebar-groups"

export function DashboardSidebar({
  userEmail,
  businessName,
  brandColor,
  nickname,
  role,
  collapsed,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>(["Gestión", "Administración"])
  const prefsLoaded = useRef(false)

  useEffect(() => {
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
    window.localStorage.setItem(SIDEBAR_GROUPS_STORAGE_KEY, JSON.stringify(openGroups))
  }, [openGroups])

  const visibleGroups = navGroups.filter((g) => g.roles.includes(role))

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

  function NavLink({
    href,
    icon: Icon,
    children,
  }: {
    href: string
    icon: React.ComponentType<{ className?: string }>
    children: React.ReactNode
  }) {
    const isActive = pathname.startsWith(href)
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center rounded-lg text-sm font-medium transition-colors",
          collapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5",
          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
        {!collapsed && children}
      </Link>
    )
  }

  function CollapsedNavLink({
    href,
    icon: Icon,
    label,
  }: {
    href: string
    icon: React.ComponentType<{ className?: string }>
    label: string
  }) {
    const isActive = pathname.startsWith(href)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className={cn(
              "flex items-center justify-center p-2 rounded-lg transition-colors",
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex sticky top-0 self-start z-40 h-screen bg-card border-r border-border flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-64 max-w-[calc(100vw-2rem)]",
        )}
      >
        <div
          className={cn(
            "flex items-center border-b border-border shrink-0",
            collapsed ? "justify-center px-0 py-5" : "gap-2 px-6 py-5",
          )}
        >
          <Image src="/short-logo.svg" alt="Koda" width={36} height={36} className="size-9 shrink-0" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">Koda Fidelity</span>
              <span className="text-xs text-muted-foreground">Plataforma de Lealtad</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto">
          {/* Panel */}
          {collapsed ? (
            <CollapsedNavLink href="/dashboard" icon={LayoutDashboard} label="Panel" />
          ) : (
            <div className="mx-2 my-1">
              <NavLink href="/dashboard" icon={LayoutDashboard}>
                Panel
              </NavLink>
            </div>
          )}

          {/* Grouped sections with Accordion */}
          {!collapsed && (
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
                      {group.items.map((item) => (
                        <NavLink key={item.name} href={item.href} icon={item.icon}>
                          {item.name}
                        </NavLink>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          {/* Collapsed: iconos con Tooltip */}
          {collapsed &&
            visibleGroups.map((group) =>
              group.items.map((item) => (
                <CollapsedNavLink key={item.name} href={item.href} icon={item.icon} label={item.name} />
              )),
            )}
        </nav>

        {/* Perfil fijado abajo */}
        <div className="border-t border-border p-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center rounded-lg transition-colors hover:bg-muted",
                  collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
                )}
              >
                <Avatar className={cn("shrink-0", collapsed ? "h-8 w-8" : "h-9 w-9")}>
                  <AvatarFallback
                    className="text-sm font-medium text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    {businessName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex flex-col items-start text-sm min-w-0">
                    <span className="font-medium text-foreground truncate w-full text-left">
                      {nickname || businessName}
                    </span>
                    <span className="text-xs text-muted-foreground truncate w-full text-left">
                      {userEmail}
                    </span>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <div className="flex items-center gap-3 px-2 py-2">
                <Avatar className="h-10 w-10">
                  <AvatarFallback
                    className="text-sm font-medium text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    {businessName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">
                    {nickname || businessName}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/my-cards" className="cursor-pointer">
                  <Smartphone className="mr-2 h-4 w-4" />
                  Mis Tarjetas
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setLogoutOpen(true)}
                className="text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cerrar sesión</AlertDialogTitle>
              <AlertDialogDescription>¿Estás seguro de que deseas cerrar sesión?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await logout()
                  router.refresh()
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                Cerrar sesión
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </aside>

      {/* Mobile bottom navbar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-end justify-around h-16 px-2">
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
                <span
                  className={cn(
                    "text-[10px] font-medium leading-tight truncate w-full text-center",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
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
                  : "bg-primary/90 hover:bg-primary shadow-primary/20",
              )}
            >
              <Camera className="h-6 w-6 text-primary-foreground" />
            </div>
            <span
              className={cn(
                "text-[10px] font-medium leading-tight",
                isScanActive ? "text-primary" : "text-muted-foreground",
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
                <span
                  className={cn(
                    "text-[10px] font-medium leading-tight truncate w-full text-center",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
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
            <span
              className={cn(
                "text-[10px] font-medium leading-tight truncate w-full text-center",
                isMenuActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              Menú
            </span>
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
