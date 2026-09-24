import "dotenv/config"
import { prisma } from "../lib/prisma"
import { activateManualSubscription } from "../lib/account-lifecycle"

const args = process.argv.slice(2)
const value = (flag: string) => {
  const index = args.indexOf(flag)
  return index < 0 ? undefined : args[index + 1]
}
const businessId = value("--business-id")
const plan = value("--plan") as "LITE" | "PRO" | undefined
const interval = (value("--interval") ?? "MONTHLY") as "MONTHLY" | "ANNUAL"
const idempotencyKey = value("--idempotency-key")
const operator = process.env.BILLING_OPERATOR || "manual-cli"

async function main() {
  if (!businessId || !plan || !["LITE", "PRO"].includes(plan) || !["MONTHLY", "ANNUAL"].includes(interval)) {
    console.error("Uso: pnpm billing:set-plan --business-id <id> --plan LITE|PRO [--interval MONTHLY|ANNUAL] [--idempotency-key <key>]")
    process.exitCode = 2
    return
  }
  const subscription = await activateManualSubscription(prisma, {
    businessId, plan, billingInterval: interval, proAccessGranted: plan === "PRO", operator, action: "set_plan", idempotencyKey,
  })
  console.log(JSON.stringify({ businessId, plan, billingInterval: interval, subscriptionId: subscription.id, status: subscription.status }))
}

main().finally(() => prisma.$disconnect())
