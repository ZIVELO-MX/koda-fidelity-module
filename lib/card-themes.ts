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
  if (!themeId) return { selectedThemeId: null, effectiveThemeId: null }
  const theme = await db.loyaltyTheme.findFirst({ where: { isActive: true, OR: [{ id: themeId }, { code: themeId }] } })
  if (!theme) throw new NotFoundError("Tema de tarjeta no encontrado")
  if (theme.plan === ThemePlan.PRO && plan !== "PRO") {
    throw new ValidationError("El tema seleccionado requiere plan Pro")
  }
  return { selectedThemeId: theme.id, effectiveThemeId: theme.id }
}
