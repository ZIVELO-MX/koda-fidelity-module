import "dotenv/config"
import { Prisma, PrismaClient } from "@prisma/client"
import { createAdminClient } from "../lib/supabase-admin"

const prisma = new PrismaClient()
const [action, email] = process.argv.slice(2)

if (!process.env.FID_DEBUG_AUTH || process.env.FID_DEBUG_AUTH !== "true" || process.env.VERCEL_ENV === "production") {
  throw new Error("Onboarding debug commands require FID_DEBUG_AUTH=true outside production")
}
if (!email || !email.toLowerCase().endsWith("@invalid.dev")) {
  throw new Error("Only @invalid.dev test accounts are supported")
}
if (!new Set(["status", "enable", "reset"]).has(action)) {
  throw new Error("Usage: pnpm onboarding:debug -- <status|enable|reset> <email>")
}

async function main() {
  const listed = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listed.error) throw listed.error
  const authUser = listed.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
  if (!authUser) throw new Error(`Auth user not found: ${email}`)
  const user = await prisma.user.findUnique({ where: { authUserId: authUser.id }, include: { onboardingProgress: true } })
  if (!user) throw new Error(`Application user not found: ${email}`)

  if (action === "status") {
    console.log(JSON.stringify(user.onboardingProgress ?? null, null, 2))
    return
  }

  const progress = user.onboardingProgress
    ? await prisma.onboardingProgress.update({
        where: { id: user.onboardingProgress.id },
        data: action === "reset"
          ? { step: "INTRO", status: "IN_PROGRESS", draftVersion: { increment: 1 }, businessDraft: Prisma.JsonNull, cardDraft: Prisma.JsonNull, acquisitionSource: null, selectedBillingInterval: null, introSkippedAt: null, acquisitionSkippedAt: null }
          : { status: "IN_PROGRESS" },
      })
    : await prisma.onboardingProgress.create({ data: { userId: user.id, businessId: user.businessId ?? undefined } })
  console.log(JSON.stringify(progress, null, 2))
}

main().finally(() => prisma.$disconnect())
