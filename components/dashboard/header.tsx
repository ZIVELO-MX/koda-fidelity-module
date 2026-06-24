"use client"

import { PanelLeftClose, PanelLeft } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

interface DashboardHeaderProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function DashboardHeader({ collapsed, onToggleCollapse }: DashboardHeaderProps) {
  return (
    <header className="hidden lg:block sticky top-0 z-30 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center px-6 py-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
              className="flex items-center justify-center rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground p-2"
            >
              {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
