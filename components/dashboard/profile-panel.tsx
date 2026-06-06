"use client"

import Link from "next/link"
import { Mail, LogOut, X, ArrowLeft, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logout } from "@/lib/actions/auth"

interface ProfilePanelProps {
  userEmail: string
  businessName: string
  brandColor: string
  nickname?: string
  onClose: () => void
  fullScreen?: boolean
  showMyCards?: boolean
}

export function ProfilePanel({
  userEmail,
  businessName,
  brandColor,
  nickname,
  onClose,
  fullScreen = false,
  showMyCards = false,
}: ProfilePanelProps) {
  const initial = businessName.charAt(0).toUpperCase()

  const avatar = (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shadow-lg"
      style={{ backgroundColor: brandColor }}
    >
      {initial}
    </div>
  )

  const content = (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
      <div className="h-24 w-24 text-4xl">
        {avatar}
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold text-foreground">{businessName}</p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full">
        <Mail className="h-4 w-4" />
        {nickname ?? userEmail}
      </div>

      {showMyCards && (
        <Link
          href="/dashboard/my-cards"
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Smartphone className="h-4 w-4" />
          Mis Tarjetas
        </Link>
      )}

      <form action={logout}>
        <Button
          variant="outline"
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </form>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-bottom">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Volver">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-foreground">Perfil</span>
        </div>
        {content}
      </div>
    )
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-semibold text-foreground text-sm">Perfil</span>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar" className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4 flex flex-col items-center gap-4">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
          style={{ backgroundColor: brandColor }}
        >
          {businessName.charAt(0).toUpperCase()}
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">{businessName}</p>
          <p className="text-xs text-muted-foreground mt-1">{nickname ?? userEmail}</p>
        </div>
        {showMyCards && (
          <Link
            href="/dashboard/my-cards"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          >
            <Smartphone className="h-4 w-4" />
            Mis Tarjetas
          </Link>
        )}
        <form action={logout} className="w-full">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </form>
      </div>
    </div>
  )
}
