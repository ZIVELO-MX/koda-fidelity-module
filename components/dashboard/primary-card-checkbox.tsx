"use client"

type PrimaryCardCheckboxProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  plan: "LITE" | "PRO"
  cardName: string
  cardId?: string | null
  currentPrimaryCardId?: string | null
  currentPrimaryName?: string | null
  disabled?: boolean
  inputId: string
}

export function PrimaryCardCheckbox({
  checked,
  onCheckedChange,
  plan,
  cardName,
  cardId,
  currentPrimaryCardId,
  currentPrimaryName,
  disabled = false,
  inputId,
}: PrimaryCardCheckboxProps) {
  const displayName = cardName.trim() || "esta tarjeta"
  const currentPrimaryIsThisCard = Boolean(cardId && currentPrimaryCardId === cardId)
  const currentPrimaryIsAnotherCard = currentPrimaryCardId
    ? currentPrimaryCardId !== cardId
    : Boolean(currentPrimaryName && currentPrimaryName !== cardName)

  let description: string
  if (plan === "LITE") {
    if (checked && currentPrimaryIsAnotherCard) {
      description = `Lite permite una sola tarjeta activa. Al guardar, ${currentPrimaryName} dejará de estar activa y ${displayName} será la única activa.`
    } else if (checked) {
      description = "Lite permite una sola tarjeta activa. Esta será la tarjeta principal."
    } else if (currentPrimaryName) {
      description = `Esta tarjeta se guardará bloqueada por el plan. ${currentPrimaryName} seguirá como la única tarjeta activa.`
    } else {
      description = "Lite requiere una tarjeta principal. Esta tarjeta se guardará como la única activa."
    }
  } else if (checked) {
    description = `${displayName} será la única tarjeta activa al cambiar a Lite.`
  } else if (currentPrimaryIsAnotherCard) {
    description = `${currentPrimaryName} seguirá como la tarjeta principal al cambiar a Lite.`
  } else {
    description = "Al cambiar a Lite se elegirá automáticamente una tarjeta activa si no hay una principal configurada."
  }
  if (disabled && plan === "LITE" && currentPrimaryIsThisCard) {
    description += " Para cambiarla, usa Configurar tarjeta principal en la lista de tarjetas."
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background p-4">
      <label
        htmlFor={inputId}
        className={`flex min-h-11 items-center gap-3 text-sm font-medium text-foreground ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <input
          id={inputId}
          name="isPrimary"
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.currentTarget.checked)}
          aria-describedby={`${inputId}-description`}
          className="size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed"
        />
        <span>Marcar como tarjeta principal</span>
      </label>
      <p id={`${inputId}-description`} aria-live="polite" className="pl-7 text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
