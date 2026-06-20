"use client"

import { useState, useMemo } from "react"
import { CARD_ICONS, getCardIcon } from "@/lib/card-icons"
import { cn } from "@/lib/utils"
import { X, Search } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

interface IconPickerProps {
  value: string | null
  onChange: (name: string | null) => void
  businessLogoUrl?: string | null
}

export function IconPicker({ value, onChange, businessLogoUrl }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim()) return CARD_ICONS
    const q = query.toLowerCase()
    return CARD_ICONS.filter(i => i.label.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
  }, [query])

  const selected = value ? getCardIcon(value) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all",
                value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {value === "logo" && businessLogoUrl ? (
                <img src={businessLogoUrl} alt="" className="h-5 w-5 object-contain rounded" />
              ) : selected ? (
                <selected.Icon className="h-5 w-5" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{selected?.label ?? "Seleccionar ícono"}</TooltipContent>
        </Tooltip>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="w-64 p-2">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar ícono..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
            autoFocus
          />
        </div>

        {businessLogoUrl && (!query.trim() || "logo".includes(query.toLowerCase())) && (
          <button
            type="button"
            onClick={() => { onChange(value === "logo" ? null : "logo"); setOpen(false); setQuery("") }}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors",
              value === "logo"
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted text-foreground",
            )}
          >
            <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center bg-card shrink-0">
              <img src={businessLogoUrl} alt="" className="h-4 w-4 object-contain rounded" />
            </div>
            <span>Logo del negocio</span>
          </button>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin resultados</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filtered.map(({ name, label, Icon }) => (
              <Tooltip key={name}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => { onChange(value === name ? null : name); setOpen(false); setQuery("") }}
                    className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-lg border transition-all",
                      value === name
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {value && (
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); setQuery("") }}
            className="flex items-center gap-2 w-full mt-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="h-4 w-4" />
            Quitar ícono
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
