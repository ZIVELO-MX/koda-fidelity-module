"use client"

import { PanelLeftClose } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

interface DashboardHeaderProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function DashboardHeader({ collapsed, onToggleCollapse }: DashboardHeaderProps) {
  return (
    <header className="hidden lg:block sticky top-0 z-30 bg-background/80 backdrop-blur-sm">
      {/* Solo colapsa. Recuperar la barra se hace desde su propio logo, así que
          este botón sobra cuando ya está colapsada. El alto se mantiene para que
          el contenido no dé un salto al plegarla. */}
      <div className="flex min-h-14 items-center px-6 py-4">
        {!collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Colapsar barra lateral"
                className="flex min-h-10 min-w-10 items-center justify-center rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground p-2"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Colapsar barra lateral</TooltipContent>
          </Tooltip>
        )}
      </div>
    </header>
  )
}
