"use client"

import { cn } from "@/lib/utils"
import type { ColorDeTexto } from "@/lib/temas-de-tarjeta"
import { pielDeTarjeta } from "@/lib/temas-de-tarjeta"

const OPCIONES: { value: ColorDeTexto; label: string; color: string }[] = [
  { value: "AUTO", label: "Auto", color: "auto" },
  { value: "LIGHT", label: "Light", color: "#FFFFFF" },
  { value: "DARK", label: "Dark", color: "#1C1B17" },
]

export function TextColorPicker({
  value,
  onChange,
  brandColor,
  themeCode,
}: {
  value: ColorDeTexto
  onChange: (value: ColorDeTexto) => void
  brandColor: string
  themeCode?: string | null
}) {
  const autoColor = pielDeTarjeta(themeCode, brandColor, "AUTO").texto

  return (
    <div role="group" aria-label="Color del texto" className="flex gap-2">
      {OPCIONES.map((option) => {
        const color = option.color === "auto" ? autoColor : option.color
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg text-xs text-muted-foreground transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
              value === option.value ? "text-foreground" : "hover:text-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-[border-color,background-color,box-shadow]",
                value === option.value
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md text-sm font-bold" style={{ backgroundColor: brandColor, color }}>
                A
              </span>
            </span>
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
