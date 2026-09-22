import { Prisma, PrismaClient, ThemePlan } from "@prisma/client"
import { NotFoundError } from "@/lib/api-utils"

export const fidelityThemeCodes = [
  "panaderia", "taqueria", "cafeteria", "hamburguesas", "pizzeria", "barberia",
  "salon-belleza", "gimnasio", "futbol", "sushi", "veterinaria", "farmacia", "heladeria",
] as const

export const fidelityProThemeCodes = ["gradiente", "foil", "cinetico", "vidrio"] as const

export async function listActiveThemes(db: PrismaClient | Prisma.TransactionClient) {
  return db.loyaltyTheme.findMany({
    where: { isActive: true },
    select: { id: true, code: true, plan: true },
    orderBy: [{ plan: "asc" }, { code: "asc" }],
  })
}

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
  return { selectedThemeId: theme.id, effectiveThemeId: null, themeLocked: true }
}
