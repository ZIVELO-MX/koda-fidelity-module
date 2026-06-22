"use client"

import { useState, useEffect } from "react"
import { es } from "date-fns/locale"
import { CalendarIcon, Trash2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

  function handleQuickOption(key: OptionKey | "none") {
    setMode(key)
    setCalendarOpen(false)
  }

  function handleSelectChange(val: string) {
    if (val === "none") {
      handleQuickOption("none")
    } else {
      handleQuickOption(val as OptionKey)
    }
  }

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

  const selectValue = mode === "none" ? "none" : mode === "custom" ? "custom" : mode
  const selectPlaceholder = value
    ? new Date(value + "T12:00:00").toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
      })
    : "Elegir fecha…"

  return (
    <div className="space-y-3" data-testid="expiration-picker">
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-input bg-background hover:bg-muted w-full sm:w-auto",
              value && "border-primary/50",
            )}
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-left">{selectPlaceholder}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-medium">Fecha de vencimiento</span>
            {value && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearDate}
                className="text-destructive h-auto px-2 py-1 text-xs gap-1 font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar fecha
              </Button>
            )}
          </div>

          <div className="border-b border-border px-3 py-3">
            <Select value={selectValue} onValueChange={handleSelectChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar plazo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin fecha de vencimiento</SelectItem>
                {QUICK_OPTIONS.map(({ key, label }) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
                <SelectItem value="custom">Elegir fecha en calendario</SelectItem>
              </SelectContent>
            </Select>
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
