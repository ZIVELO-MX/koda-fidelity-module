/** Versioned DTOs shared by the Fidelity backend and Rulaxx UI. */
export type BusinessPublic = {
  name: string
  brandColor: string
  logoUrl: string | null
  iconName: string | null
  website?: string | null
  instagram?: string | null
}

export type CardSummary = {
  id: string
  name: string
  reward: string
  stampsRequired: number
  isActive: boolean
  status?: "DRAFT" | "ACTIVE" | "LOCKED_BY_PLAN" | "ARCHIVED"
  expiresAt?: string | Date | null
  customers?: number
  totalStamps?: number
  selectedTheme?: { id: string; code: string; plan: "LITE" | "PRO" } | null
  effectiveTheme?: { id: string; code: string; plan: "LITE" | "PRO" } | null
  themeLocked?: boolean
}

export type AccountContext = {
  user: { id: string; email: string; name: string; role: string }
  business: (BusinessPublic & { id: string }) | null
  onboardingStatus?: "IN_PROGRESS" | "AWAITING_PAYMENT" | "COMPLETED" | "ACTIVE"
  plan?: "LITE" | "PRO"
}

export type ApiErrorBody = {
  error: string
  code: string
  action: string
  requestId: string
  retryable: boolean
}
