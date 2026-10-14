"use client"

import { PanelLeftClose } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { AyudaContextual } from "./ayuda-contextual"

interface DashboardHeaderProps {
  collapsed: boolean
  onToggleCollapse: () => void
  businessName: string
}

export function DashboardHeader({ collapsed, onToggleCollapse, businessName }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm">
      <div className="flex min-h-12 items-center gap-2 px-4 py-2 lg:min-h-14 lg:px-6 lg:py-4">
        {/* Solo colapsa. Recuperar la barra se hace desde su propio logo, así que
            este botón sobra cuando ya está colapsada. El alto se mantiene para que
            el contenido no dé un salto al plegarla. */}
        {!collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Colapsar barra lateral"
                className="hidden min-h-10 min-w-10 items-center justify-center rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground p-2 lg:flex"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Colapsar barra lateral</TooltipContent>
          </Tooltip>
        )}

        {/* En móvil la barra lateral no está a la vista, así que el encabezado
            dice de qué negocio es este panel. */}
        <span className="truncate text-sm font-semibold text-foreground lg:hidden">
          {businessName}
        </span>

        <div className="ml-auto">
          <AyudaContextual />
        </div>
      </div>
    </header>
  )
}
