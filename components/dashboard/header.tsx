"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ProfilePanel } from "./profile-panel"
import { ThemeToggle } from "@/components/theme-toggle"
import { useState } from "react"

import type { Role } from "@prisma/client"

interface DashboardHeaderProps {
  userEmail: string
  businessName: string
  brandColor: string
  nickname?: string
  role: Role
}

export function DashboardHeader({ userEmail, businessName, brandColor, nickname, role }: DashboardHeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="hidden lg:block sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-end gap-2 px-6 py-4">
        <ThemeToggle className="text-muted-foreground hover:text-foreground" />
        <div
          onClick={() => setOpen(!open)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(!open) } }}
          role="button"
          tabIndex={0}
          aria-label="Abrir perfil"
          className="relative cursor-pointer"
        >
          <Avatar className="h-9 w-9 border-2 border-border hover:opacity-80 transition-opacity">
            <AvatarFallback
              className="text-sm font-medium text-white"
              style={{ backgroundColor: brandColor }}
            >
              {businessName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {open && (
            <ProfilePanel
              userEmail={userEmail}
              businessName={businessName}
              brandColor={brandColor}
              nickname={nickname}
              role={role}
              onClose={() => setOpen(false)}
              fullScreen={false}
              showMyCards={true}
            />
          )}
        </div>
      </div>
    </header>
  )
}
