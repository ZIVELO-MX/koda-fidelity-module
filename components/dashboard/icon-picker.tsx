"use client"

import { useState, useMemo, useId } from "react"
import { CARD_ICONS, getCardIcon } from "@/lib/card-icons"
import { cn } from "@/lib/utils"
import { X, Search, Plus } from "lucide-react"
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
  const searchId = useId()

  const buscando = query.trim() !== ""

  const filtered = useMemo(() => {
    if (!buscando) return CARD_ICONS
    const q = query.toLowerCase()
    // También por rubro: escribir "farmacia" trae sus íconos aunque ninguna
    // etiqueta diga esa palabra.
    return CARD_ICONS.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.grupo.toLowerCase().includes(q),
    )
  }, [query, buscando])

  const selected = value ? getCardIcon(value) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={selected?.label ? `Ícono seleccionado: ${selected.label}` : "Seleccionar ícono"}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-[border-color,background-color,color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50",
            value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {value === "logo" && businessLogoUrl ? (
            <img src={businessLogoUrl} alt="" className="h-5 w-5 object-contain rounded" />
          ) : selected ? (
            <selected.Icon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </PopoverTrigger>
      {/* La altura la manda el hueco que Radix mide en pantalla, no el contenido:
          sin este tope el panel crecía con los cuarenta íconos, se salía por
          abajo y quien scrolleaba movía la página entera. collisionPadding lo
          despega del borde. */}
      <PopoverContent
        align="start"
        side="bottom"
        // Abajo se reserva más: en móvil hay una barra de navegación fija, y sin
        // esta holgura el panel llegaba hasta debajo de ella.
        collisionPadding={{ top: 12, bottom: 84, left: 12, right: 12 }}
        className="flex max-h-[min(20rem,var(--radix-popover-content-available-height))] w-[min(18rem,calc(100vw-2rem))] flex-col p-2"
      >
        <div className="relative mb-2">
          <label htmlFor={searchId} className="sr-only">Buscar ícono</label>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id={searchId}
            name="icon-search"
            type="text"
            placeholder="Buscar ícono…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        {businessLogoUrl && (!query.trim() || "logo".includes(query.toLowerCase())) && (
          <button
            type="button"
            onClick={() => { onChange(value === "logo" ? null : "logo"); setOpen(false); setQuery("") }}
            aria-pressed={value === "logo"}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
              value === "logo"
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted text-foreground",
            )}
          >
            <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center bg-card shrink-0">
              <img src={businessLogoUrl} alt="" className="h-4 w-4 object-contain rounded" />
            </div>
            <span className="min-w-0 truncate">Logo del negocio</span>
          </button>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin resultados</p>
        ) : (
          // Una sola parrilla, sin encabezados de rubro. El scroll vive aquí
          // dentro, no en la ventana: min-h-0 es lo que deja encoger a este hijo
          // del flex para que el desbordamiento sea suyo y no de la página.
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-1.5">
              {filtered.map(({ name, label, Icon }) => (
                <Tooltip key={name}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => { onChange(value === name ? null : name); setOpen(false); setQuery("") }}
                      aria-label={label}
                      aria-pressed={value === name}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border transition-[border-color,background-color,color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        value === name
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {value && (
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); setQuery("") }}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Quitar ícono
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
