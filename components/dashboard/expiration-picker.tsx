"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { addDays, addMonths, addYears, toDateInputValue } from "@/lib/card-utils"

type OptionKey = "1w" | "1m" | "3m" | "6m" | "1y"
type Mode = "none" | "custom" | OptionKey

const QUICK_OPTIONS: { key: OptionKey; label: string; compute: () => Date }[] = [
  { key: "1w", label: "1 semana", compute: () => addDays(7) },
  { key: "1m", label: "1 mes", compute: () => addMonths(1) },
  { key: "3m", label: "3 meses", compute: () => addMonths(3) },
  { key: "6m", label: "6 meses", compute: () => addMonths(6) },
  { key: "1y", label: "1 año", compute: () => addYears(1) },
]

interface ExpirationPickerProps {
  value: string
  onChange: (isoDate: string) => void
}

export function ExpirationPicker({ value, onChange }: ExpirationPickerProps) {
  const [mode, setMode] = useState<Mode>(() => (!value ? "none" : "custom"))

  useEffect(() => {
    if (mode === "none") { onChange(""); return }
    const opt = QUICK_OPTIONS.find((o) => o.key === mode)
    if (opt) onChange(toDateInputValue(opt.compute()))
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const today = toDateInputValue(new Date())

  return (
    <div className="space-y-3" data-testid="expiration-picker">
      <div className="flex flex-wrap gap-2">
        {QUICK_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              mode === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMode("none")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            mode === "none"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          Sin caducidad
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            mode === "custom"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          Elegir fecha…
        </button>
      </div>

      {mode === "custom" && (
        <Input
          type="date"
          min={today}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[200px]"
          data-testid="expiration-date-input"
        />
      )}

      {mode !== "none" && value && (
        <p className="text-xs text-muted-foreground">
          Vence el{" "}
          {new Date(value + "T12:00:00").toLocaleDateString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  )
}
