"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, LogOut, Smartphone, type LucideIcon } from "lucide-react"
import type { Role } from "@prisma/client"
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

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

interface MobileSettingsPanelProps {
  userEmail: string
  businessName: string
  brandColor: string
  logoUrl?: string
  role?: Role
  navGroups: NavGroup[]
  onClose: () => void
}

export function MobileSettingsPanel({
  userEmail,
  businessName,
  brandColor,
  logoUrl,
  navGroups,
  onClose,
}: MobileSettingsPanelProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const hasNav = navGroups.some((g) => g.items.length > 0)

  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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

      <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Volver">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-foreground">Menú</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Profile strip */}
          <div className="flex items-center gap-4 px-6 py-5 border-b border-border bg-card">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center font-bold text-white text-2xl shrink-0 shadow overflow-hidden"
              style={{ backgroundColor: logoUrl ? undefined : brandColor }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt={businessName} className="w-full h-full object-contain p-1" />
              ) : (
                businessName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{businessName}</p>
              <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>

          <div className="p-4 space-y-5 pb-10">
            {/* Grouped nav sections */}
            {hasNav && navGroups.map((group) =>
              group.items.length === 0 ? null : (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
                      >
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground text-center leading-tight">
                          {item.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* Bottom actions */}
            <div className="border-t border-border pt-4 space-y-2">
              <Link
                href="/dashboard/my-cards"
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
              >
                <Smartphone className="h-4 w-4" />
                Mis Tarjetas
              </Link>
              <Button
                variant="outline"
                className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setConfirmOpen(true)}
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
