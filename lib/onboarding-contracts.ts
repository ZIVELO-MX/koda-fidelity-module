import { z } from "zod"

export const onboardingDraftSchema = z.object({
  draftVersion: z.number().int().min(0),
  business: z.object({ name: z.string().trim().min(1).max(120).optional(), categoryId: z.string().trim().min(1).optional() }).optional(),
  card: z.object({ name: z.string().trim().min(1).max(120).optional(), reward: z.string().trim().min(1).max(240).optional(), stampsRequired: z.number().int().min(1).max(100).optional(), brandColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional() }).optional(),
  acquisitionSource: z.enum(["KODA_POS", "REFERRAL", "SOCIAL", "SEARCH", "EVENT", "OTHER"]).nullable().optional(),
  selectedBillingInterval: z.enum(["MONTHLY", "ANNUAL"]).nullable().optional(),
})

export const advanceSchema = z.object({
  action: z.enum(["complete_intro", "skip_intro", "complete_business", "complete_card", "complete_acquisition", "skip_acquisition", "select_billing_interval", "open_paywall"]),
  draftVersion: z.number().int().min(0),
  billingInterval: z.enum(["MONTHLY", "ANNUAL"]).optional(),
})

export const manualSubscriptionSchema = z.object({
  businessId: z.string().min(1),
  action: z.enum(["activate", "renew", "set_plan", "cancel", "past_due"]),
  plan: z.enum(["LITE", "PRO"]).optional(),
  billingInterval: z.enum(["MONTHLY", "ANNUAL"]).optional(),
  amountMinor: z.number().int().nonnegative().optional(),
  externalReference: z.string().trim().max(200).optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  proTrialEndsAt: z.coerce.date().nullable().optional(),
})
