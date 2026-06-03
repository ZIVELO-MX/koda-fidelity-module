"use client"

import { CARD_ICONS } from "@/lib/card-icons"
import { cn } from "@/lib/utils"

interface IconPickerProps {
  value: string | null
  onChange: (name: string | null) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {CARD_ICONS.map(({ name, label, Icon }) => {
        const selected = value === name
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(selected ? null : name)}
            title={label}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all w-[72px]",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
