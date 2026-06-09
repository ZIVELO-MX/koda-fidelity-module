function startOfUTCDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function isExpired(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false
  return startOfUTCDay(new Date()) > startOfUTCDay(new Date(expiresAt))
}

export function daysUntilExpiry(expiresAt: Date | string | null | undefined): number | null {
  if (!expiresAt) return null
  return Math.round(
    (startOfUTCDay(new Date(expiresAt)) - startOfUTCDay(new Date())) / 86_400_000
  )
}

export function addDays(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

export function addMonths(months: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d
}

export function addYears(years: number): Date {
  const d = new Date()
  d.setFullYear(d.getFullYear() + years)
  return d
}

/** Returns YYYY-MM-DD using LOCAL date components (avoids UTC timezone shift). */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
