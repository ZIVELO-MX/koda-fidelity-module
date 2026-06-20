"use client"

import { useState } from "react"
import { CARD_ICONS } from "@/lib/card-icons"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"

interface IconPickerProps {
  value: string | null
  onChange: (name: string | null) => void
  businessLogoUrl?: string | null
}

const INITIAL_SHOWN = 3

export function IconPicker({ value, onChange, businessLogoUrl }: IconPickerProps) {
  const [showAll, setShowAll] = useState(false)
  const icons = showAll ? CARD_ICONS : CARD_ICONS.slice(0, INITIAL_SHOWN)
  const remaining = CARD_ICONS.length - INITIAL_SHOWN

  return (
    <div className="flex flex-wrap gap-2">
      {businessLogoUrl && (
        <button
          key="logo"
          type="button"
          onClick={() => onChange(value === "logo" ? null : "logo")}
          title="Logo del negocio"
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all",
            value === "logo"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          <img src={businessLogoUrl} alt="" className="h-5 w-5 object-contain rounded" />
        </button>
      )}
      {icons.map(({ name, label, Icon }) => {
        const selected = value === name
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(selected ? null : name)}
            title={label}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
          </button>
        )
      })}
      {!showAll && CARD_ICONS.length > INITIAL_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          title={`Ver más (${remaining})`}
          className="flex items-center justify-center w-10 h-10 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
