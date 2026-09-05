import { z } from "zod"

export const statsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
})

export const pageQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  cardId: z.string().trim().min(1).optional(),
  readyToRedeem: z.enum(["true", "false"]).transform((value) => value === "true").default(false),
  sort: z.enum(["name", "createdAt", "stamps", "updatedAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const activityQuerySchema = z.object({
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
