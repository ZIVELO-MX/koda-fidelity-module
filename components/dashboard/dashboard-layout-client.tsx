"use client"

import { useSyncExternalStore, useEffect, useCallback } from "react"
import { DashboardSidebar } from "./sidebar"
import { DashboardHeader } from "./header"
import type { Role } from "@prisma/client"
import { AccountPlanChangeNotice } from "./account-plan-change-notice"
import type { AccountPlan } from "@/lib/plan-change-notice"

const SIDEBAR_STATE_KEY = "dashboard-sidebar-state"

function subscribeSidebar(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(SIDEBAR_STATE_KEY, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(SIDEBAR_STATE_KEY, onChange)
  }
}

const readSidebar = () => window.localStorage.getItem(SIDEBAR_STATE_KEY) === "true"
const serverSidebar = () => false

interface DashboardLayoutClientProps {
  children: React.ReactNode
  userEmail: string
  businessName: string
  brandColor: string
  nickname?: string
  role: Role
  accountPlan: AccountPlan | null
  planChangeNotice: { eventId: string; from: AccountPlan; to: AccountPlan } | null
  closureScheduledFor?: string
}

export function DashboardLayoutClient({
  children,
  userEmail,
  businessName,
  brandColor,
  nickname,
  role,
  accountPlan,
  planChangeNotice,
  closureScheduledFor,
}: DashboardLayoutClientProps) {
  const sidebarCollapsed = useSyncExternalStore(subscribeSidebar, readSidebar, serverSidebar)

  useEffect(() => {
    document.documentElement.classList.toggle("sidebar-collapsed", sidebarCollapsed)
  }, [sidebarCollapsed])

  const toggleCollapse = useCallback(() => {
    window.localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(!readSidebar()))
    window.dispatchEvent(new Event(SIDEBAR_STATE_KEY))
  }, [])

  return (
    <div className="lg:flex min-h-screen">
      <DashboardSidebar
        userEmail={userEmail}
        businessName={businessName}
        brandColor={brandColor}
        nickname={nickname}
        role={role}
        accountPlan={accountPlan}
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
          {planChangeNotice ? <AccountPlanChangeNotice {...planChangeNotice} /> : null}
          {closureScheduledFor ? <div role="status" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">Cuenta en sólo lectura hasta {new Date(closureScheduledFor).toLocaleDateString("es-MX")}. Puedes consultar, exportar o cancelar el cierre desde Configuración.</div> : null}
          {children}
        </main>
      </div>
    </div>
  )
}
