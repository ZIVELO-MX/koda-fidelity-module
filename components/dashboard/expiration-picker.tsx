"use client"

import { useState, useEffect } from "react"
import { es } from "date-fns/locale"
import { CalendarIcon, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { addDays, addMonths, addYears, toDateInputValue } from "@/lib/card-utils"
import { cn } from "@/lib/utils"

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
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    if (mode === "none") { onChange(""); return }
    const opt = QUICK_OPTIONS.find((o) => o.key === mode)
    if (opt) onChange(toDateInputValue(opt.compute()))
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date()
  const selectedDate = value ? new Date(value + "T12:00:00") : undefined

  function handleDateSelect(date: Date | undefined) {
    if (date) {
      onChange(toDateInputValue(date))
      setMode("custom")
      setCalendarOpen(false)
    }
  }

  function handleClearDate() {
    onChange("")
    setMode("none")
    setCalendarOpen(false)
  }

  return (
    <div className="space-y-3" data-testid="expiration-picker">
      <div className="flex flex-wrap gap-2">
        {QUICK_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              mode === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-muted/80",
            )}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMode("none")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
            mode === "none"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground hover:bg-muted/80",
          )}
        >
          Sin caducidad
        </button>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-1.5",
                mode === "custom"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80",
              )}
            >
              {value ? (
                <>
                  <CalendarIcon className="h-4 w-4" />
                  {new Date(value + "T12:00:00").toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </>
              ) : (
                "Elegir fecha…"
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-sm font-medium">Seleccionar fecha</span>
              {value && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearDate}
                  className="text-destructive h-auto px-2 py-1 text-xs gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar fecha
                </Button>
              )}
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => date < new Date(today.getFullYear(), today.getMonth(), today.getDate())}
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>

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
