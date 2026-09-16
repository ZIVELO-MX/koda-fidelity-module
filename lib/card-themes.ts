import { Prisma, PrismaClient, ThemePlan } from "@prisma/client"
import { NotFoundError, ValidationError } from "@/lib/api-utils"

export const fidelityThemeCodes = [
  "panaderia", "taqueria", "cafeteria", "hamburguesas", "pizzeria", "barberia",
  "salon-belleza", "gimnasio", "futbol", "sushi", "veterinaria", "farmacia", "heladeria",
] as const

export async function resolveTheme(
  db: PrismaClient | Prisma.TransactionClient,
  themeId: string | undefined,
  plan: "LITE" | "PRO",
) {
  if (!themeId) return { selectedThemeId: null, effectiveThemeId: null, themeLocked: false }
  const theme = await db.loyaltyTheme.findFirst({ where: { isActive: true, OR: [{ id: themeId }, { code: themeId }] } })
  if (!theme) throw new NotFoundError("Tema de tarjeta no encontrado")
  if (theme.plan !== ThemePlan.PRO || plan === "PRO") {
    return { selectedThemeId: theme.id, effectiveThemeId: theme.id, themeLocked: false }
  }
  const fallback = await db.loyaltyTheme.findFirst({ where: { isActive: true, plan: ThemePlan.LITE }, orderBy: { code: "asc" } })
  if (!fallback) throw new ValidationError("No hay un tema Lite disponible para fallback")
  return { selectedThemeId: theme.id, effectiveThemeId: fallback.id, themeLocked: true }
}
