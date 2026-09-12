import "dotenv/config"
import { Prisma, PrismaClient } from "@prisma/client"
import { createAdminClient } from "../lib/supabase-admin"
import { randomUUID } from "node:crypto"
import { config } from "../lib/config"

const prisma = new PrismaClient()
const args = process.argv.slice(2).filter((arg) => arg !== "--")
const [action, email] = args
const fail = (message: string): never => { throw new Error(`[requestId:${randomUUID()}] ${message}`) }

if (!config.isDebugAuthEnabled) {
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
  const admin = createAdminClient().auth.admin
  let page = 1
  let authUser: Awaited<ReturnType<typeof admin.listUsers>>["data"]["users"][number] | undefined
  while (!authUser) {
    const listed = await admin.listUsers({ page, perPage: 1000 })
    if (listed.error) fail(`Auth lookup failed: ${listed.error.message}`)
    authUser = listed.data.users.find((user) => user.email?.toLowerCase() === targetEmail.toLowerCase())
    if (listed.data.users.length < 1000) break
    page += 1
  }
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

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unexpected onboarding debug error"
  console.error(message.includes("requestId:") ? message : `[requestId:${randomUUID()}] ${message}`)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
