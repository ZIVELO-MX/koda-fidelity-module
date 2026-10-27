import { fechaLocal } from "@/lib/dia-local"

function startOfUTCDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

// `expiresAt` sale de un <input type="date">: «2026-10-14» es medianoche UTC y
// su fecha UTC es el día del calendario. Hoy, en cambio, es el día de México:
// cortarlo en UTC vencía la tarjeta a las seis de la tarde de su último día.
const hoy = () => Date.parse(fechaLocal())

export function isExpired(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false
  return hoy() > startOfUTCDay(new Date(expiresAt))
}

/**
 * El vencimiento, para mostrarlo. Es un día del calendario guardado como
 * medianoche UTC: con la zona del navegador, en México salía un día antes.
 */
export function formatExpiryDate(expiresAt: Date | string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(expiresAt).toLocaleDateString("es-MX", { ...options, timeZone: "UTC" })
}

/** El vencimiento como valor de `<input type="date">`, sin depender de la zona del servidor. */
export function expiryInputValue(expiresAt: Date | string): string {
  return new Date(expiresAt).toISOString().slice(0, 10)
}

export function daysUntilExpiry(expiresAt: Date | string | null | undefined): number | null {
  if (!expiresAt) return null
  return Math.round((startOfUTCDay(new Date(expiresAt)) - hoy()) / 86_400_000)
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

// ── Milestone Reward Helpers ──────────────────────────────────────────

export type MilestoneRewardData = {
  stampNumber: number
  label: string
  iconName: string | null
  probability: number
}

export function pickMilestoneReward(
  newStampCount: number,
  milestones: MilestoneRewardData[],
): MilestoneRewardData | null {
  const milestone = milestones.find(m => m.stampNumber === newStampCount)
  if (!milestone) return null
  const roll = Math.random() * 100
  return roll < milestone.probability ? milestone : null
}

const RARITY_COLORS = [
  { max: 9,   color: "oklch(0.6 0.22 350)", label: "Campeón" },
  { max: 24,  color: "oklch(0.6 0.18 230)", label: "Legendaria" },
  { max: 49,  color: "oklch(0.55 0.22 290)", label: "Épica" },
  { max: 99,  color: "oklch(0.65 0.18 40)", label: "Rara" },
  { max: 100, color: "oklch(0.6 0.02 260)", label: "Común" },
] as const

export function getRarityColor(probability: number): string {
  const entry = RARITY_COLORS.find(c => probability <= c.max)
  return entry?.color ?? RARITY_COLORS[4].color
}

export function getRarityLabel(probability: number): string {
  const entry = RARITY_COLORS.find(c => probability <= c.max)
  return entry?.label ?? RARITY_COLORS[4].label
}

export function getRarityDescription(probability: number): string {
  if (probability === 0) return "Ningún cliente obtendrá este bonus"
  if (probability === 100) return "Todos los clientes obtendrán este bonus"
  const denominator = Math.round(100 / probability)
  return `1 de cada ${denominator} clientes obtendrá este bonus`
}

export function getRarityRange(probability: number): string {
  if (probability === 0) return "0%"
  if (probability === 100) return "100%"
  if (probability >= 50) return "50–99%"
  if (probability >= 25) return "25–49%"
  if (probability >= 10) return "10–24%"
  return "<10%"
}
