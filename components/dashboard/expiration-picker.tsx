"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { addDays, toDateInputValue } from "@/lib/card-utils"

const QUICK_OPTIONS = [
  { label: "1 semana", days: 7 },
  { label: "1 mes", days: 30 },
  { label: "3 meses", days: 90 },
  { label: "6 meses", days: 180 },
  { label: "1 año", days: 365 },
] as const

type Mode = "none" | "custom" | number

interface ExpirationPickerProps {
  value: string
  onChange: (isoDate: string) => void
}

export function ExpirationPicker({ value, onChange }: ExpirationPickerProps) {
  const [mode, setMode] = useState<Mode>(() => {
    if (!value) return "none"
    return "custom"
  })

  useEffect(() => {
    if (mode === "none") {
      onChange("")
      return
    }
    if (typeof mode === "number") {
      onChange(toDateInputValue(addDays(mode)))
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const today = toDateInputValue(new Date())

  return (
    <div className="space-y-3" data-testid="expiration-picker">
      <div className="flex flex-wrap gap-2">
        {QUICK_OPTIONS.map(({ label, days }) => (
          <button
            key={days}
            type="button"
            onClick={() => setMode(days)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              mode === days
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
