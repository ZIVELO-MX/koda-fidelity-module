import "dotenv/config"
import { Prisma, PrismaClient } from "@prisma/client"
import { createAdminClient } from "../lib/supabase-admin"
import { randomUUID } from "node:crypto"

const prisma = new PrismaClient()
const [action, email] = process.argv.slice(2)
const fail = (message: string): never => { throw new Error(`[requestId:${randomUUID()}] ${message}`) }

if (!process.env.FID_DEBUG_AUTH || process.env.FID_DEBUG_AUTH !== "true" || process.env.VERCEL_ENV === "production") {
  fail("Onboarding debug commands require FID_DEBUG_AUTH=true outside production")
}
if (!email || !email.toLowerCase().endsWith("@invalid.dev")) {
  fail("Only @invalid.dev test accounts are supported")
}
if (!new Set(["status", "enable", "reset"]).has(action)) {
  fail("Usage: pnpm onboarding:debug -- <status|enable|reset> <email>")
}
const targetEmail = email
const command = action as "status" | "enable" | "reset"

async function main() {
  const listed = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listed.error) fail(`Auth lookup failed: ${listed.error.message}`)
  const authUser = listed.data.users.find((user) => user.email?.toLowerCase() === targetEmail.toLowerCase())
  const authId = authUser?.id ?? fail(`Auth user not found: ${targetEmail}`)
  const user = await prisma.user.findUnique({ where: { authUserId: authId }, include: { onboardingProgress: true } })
  const account = user ?? fail(`Application user not found: ${targetEmail}`)

  if (command === "status") {
    console.log(JSON.stringify(account.onboardingProgress ?? null, null, 2))
    return
  }

  const progress = account.onboardingProgress
    ? await prisma.onboardingProgress.update({
        where: { id: account.onboardingProgress.id },
        data: command === "reset"
          ? { step: "INTRO", status: "IN_PROGRESS", draftVersion: { increment: 1 }, businessDraft: Prisma.JsonNull, cardDraft: Prisma.JsonNull, acquisitionSource: null, selectedBillingInterval: null, introSkippedAt: null, acquisitionSkippedAt: null }
          : { status: "IN_PROGRESS" },
      })
    : await prisma.onboardingProgress.create({ data: { userId: account.id, businessId: account.businessId ?? undefined } })
  console.log(JSON.stringify(progress, null, 2))
}

main().finally(() => prisma.$disconnect())
