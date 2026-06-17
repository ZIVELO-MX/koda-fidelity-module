"use client"

import { CARD_ICONS } from "@/lib/card-icons"
import { cn } from "@/lib/utils"

interface IconPickerProps {
  value: string | null
  onChange: (name: string | null) => void
  businessLogoUrl?: string | null
}

export function IconPicker({ value, onChange, businessLogoUrl }: IconPickerProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {businessLogoUrl && (
        <button
          key="logo"
          type="button"
          onClick={() => onChange(value === "logo" ? null : "logo")}
          title="Logo del negocio"
          className={cn(
            "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all w-[72px]",
            value === "logo"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          <img src={businessLogoUrl} alt="Logo" className="h-5 w-5 object-contain rounded" />
          <span className="text-[10px] font-medium leading-none">Logo</span>
        </button>
      )}
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
