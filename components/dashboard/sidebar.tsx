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
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { ProfilePanel } from "./profile-panel"
import { useState } from "react"

interface DashboardSidebarProps {
  userEmail: string
  businessName: string
  brandColor: string
  nickname?: string
}

const desktopNavigation = [
  { name: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tarjetas de Lealtad", href: "/dashboard/cards", icon: CreditCard },
  { name: "Clientes", href: "/dashboard/customers", icon: Users },
  { name: "Códigos QR", href: "/dashboard/qr-codes", icon: QrCode },
  { name: "Marca", href: "/dashboard/branding", icon: Palette },
  { name: "Configuración", href: "/dashboard/settings", icon: Settings },
  { name: "Documentación", href: "/docs", icon: BookOpen },
]

const mobileNavigation = [
  { name: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tarjetas", href: "/dashboard/cards", icon: CreditCard },
  { name: "Clientes", href: "/dashboard/customers", icon: Users },
  { name: "QR", href: "/dashboard/qr-codes", icon: QrCode },
  { name: "Marca", href: "/dashboard/branding", icon: Palette },
]

export function DashboardSidebar({ userEmail, businessName, brandColor, nickname }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-full w-64 max-w-[calc(100vw-2rem)] bg-card border-r border-border flex-col">
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

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {desktopNavigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
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
        </nav>

        <div className="p-4 border-t border-border space-y-1">
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
                <AlertDialogDescription>
                  ¿Estás seguro de que deseas cerrar sesión?
                </AlertDialogDescription>
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 min-w-0 px-2 py-1 rounded-lg transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight truncate w-full text-center">
                  {item.name}
                </span>
              </Link>
            )
          })}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 min-w-0 px-2 py-1 rounded-lg transition-colors text-muted-foreground"
          >
            <div
              className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: brandColor }}
            >
              {businessName.charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px] font-medium leading-tight truncate w-full text-center">
              Perfil
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile profile panel */}
      {profileOpen && (
        <ProfilePanel
          userEmail={userEmail}
          businessName={businessName}
          brandColor={brandColor}
          nickname={nickname}
          onClose={() => setProfileOpen(false)}
          fullScreen
          showMyCards={true}
        />
      )}
    </>
  )
}
