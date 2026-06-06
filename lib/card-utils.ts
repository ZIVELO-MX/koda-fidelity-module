export function isExpired(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}

export function daysUntilExpiry(expiresAt: Date | string | null | undefined): number | null {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
}

export function addDays(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(23, 59, 59, 0)
  return d
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}
