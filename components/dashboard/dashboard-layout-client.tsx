"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardSidebar } from "./sidebar"
import { DashboardHeader } from "./header"
import type { Role } from "@prisma/client"

const SIDEBAR_STATE_KEY = "dashboard-sidebar-state"

interface DashboardLayoutClientProps {
  children: React.ReactNode
  userEmail: string
  businessName: string
  brandColor: string
  nickname?: string
  role: Role
  closureScheduledFor?: string
}

export function DashboardLayoutClient({
  children,
  userEmail,
  businessName,
  brandColor,
  nickname,
  role,
  closureScheduledFor,
}: DashboardLayoutClientProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    const stored = window.localStorage.getItem(SIDEBAR_STATE_KEY)
    if (stored === "true") {
      document.documentElement.classList.add("sidebar-collapsed")
      return true
    }
    return false
  })

  const toggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(next))
      document.documentElement.classList.toggle("sidebar-collapsed", next)
      return next
    })
  }, [])

  const [ready, setReady] = useState(
    typeof window !== "undefined" ? document.documentElement.classList.contains("sidebar-collapsed") : false
  )
  useEffect(() => { setReady(true) }, [])
  if (!ready) return null

  return (
    <div className="lg:flex min-h-screen">
      <DashboardSidebar
        userEmail={userEmail}
        businessName={businessName}
        brandColor={brandColor}
        nickname={nickname}
        role={role}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className="flex flex-1 flex-col min-w-0 transition-all duration-300">
        <DashboardHeader
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleCollapse}
          businessName={businessName}
        />
        <main className="flex-1 p-4 sm:p-6 pt-4 lg:pt-6 pb-20 lg:pb-6">
          {closureScheduledFor ? <div role="status" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">Cuenta en sólo lectura hasta {new Date(closureScheduledFor).toLocaleDateString("es-MX")}. Puedes consultar, exportar o cancelar el cierre desde Configuración.</div> : null}
          {children}
        </main>
      </div>
    </div>
  )
}
