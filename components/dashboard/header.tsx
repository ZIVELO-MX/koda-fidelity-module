"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ProfilePanel } from "./profile-panel"
import { useState } from "react"

interface DashboardHeaderProps {
  userEmail: string
  businessName: string
  brandColor: string
}

export function DashboardHeader({ userEmail, businessName, brandColor }: DashboardHeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="hidden lg:block sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-end px-6 py-4">
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
              onClose={() => setOpen(false)}
              fullScreen={false}
            />
          )}
        </div>
      </div>
    </header>
  )
}
