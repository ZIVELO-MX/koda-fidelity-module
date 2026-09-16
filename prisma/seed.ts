import { PrismaClient } from "@prisma/client"
import { mockData } from "./mock-data"
import { createAdminClient } from "../lib/supabase-admin"
import { ensureSeedAuthUser, resolveSeedRoleUsers } from "./seed-auth"
import { fidelityThemeCodes } from "../lib/card-themes"

const prisma = new PrismaClient()

async function main() {
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error("Refusing destructive seed. Set ALLOW_DESTRUCTIVE_SEED=true explicitly for an isolated development or CI database.")
  }
  const roleUserIds = await resolveSeedRoleUsers(createAdminClient().auth.admin, process.env)
  const genericPassword = process.env.DEV_SEED_GENERIC_PASSWORD || "Koda1234!"
  if (genericPassword.length < 8) throw new Error("DEV_SEED_GENERIC_PASSWORD must have at least 8 characters")
  const developmentAccounts = [
    { email: "raul.mendez@zivelo.dev", name: "Raúl Mendez", businessId: "biz-fidelity-rulaxx" },
    { email: "benjamin.rodriguez@zivelo.dev", name: "Benjamin Rodriguez", businessId: "biz-fidelity-benrod" },
  ] as const
  const preservedBusinessIds = developmentAccounts.map(account => account.businessId)
  const admin = createAdminClient().auth.admin
  const developmentAuthUsers = await Promise.all(developmentAccounts.map(account => ensureSeedAuthUser(admin, { ...account, role: "admin", passwordEnv: "DEV_SEED_GENERIC_PASSWORD" }, genericPassword, true, true)))
  console.log("Seeding database...")

  const roleBusiness = await prisma.$transaction(async tx => {
    for (const code of fidelityThemeCodes) {
      await tx.loyaltyTheme.upsert({ where: { code }, create: { code, plan: "LITE" }, update: { isActive: true } })
    }
    await tx.stampLog.deleteMany({ where: { businessId: { notIn: preservedBusinessIds } } })
    await tx.customer.deleteMany({ where: { card: { businessId: { notIn: preservedBusinessIds } } } })
    await tx.loyaltyCard.deleteMany({ where: { businessId: { notIn: preservedBusinessIds } } })
    await tx.business.deleteMany({ where: { id: { notIn: preservedBusinessIds } } })

    for (const biz of mockData.businesses) {
      await tx.business.create({ data: biz })
      console.log(`  ✓ Business: ${biz.name}`)
    }

    for (const cust of mockData.customers) {
      await tx.customer.create({ data: cust })
      console.log(`  ✓ Customer: ${cust.name} (${cust.stamps}/${cust.cardId})`)
    }
    for (const [index, account] of developmentAccounts.entries()) {
      await tx.business.upsert({
        where: { id: account.businessId },
        create: {
          id: account.businessId,
          name: `${account.name} Fidelity Dev`,
          email: account.email,
          businessType: "Development Fixture",
        },
        update: { email: account.email, name: `${account.name} Fidelity Dev` },
      })
      const user = await tx.user.upsert({ where: { authUserId: developmentAuthUsers[index] }, create: { authUserId: developmentAuthUsers[index], email: account.email, name: account.name, role: "admin", businessId: account.businessId, passwordSetupRequired: true }, update: { businessId: account.businessId, email: account.email, name: account.name, role: "admin", passwordSetupRequired: true } })
      await tx.onboardingProgress.upsert({ where: { userId: user.id }, create: { userId: user.id, businessId: account.businessId }, update: { businessId: account.businessId } })
    }
    return tx.business.create({
      data: {
        id: "biz-fidelity-auth-roles",
        name: "Fidelity Auth Role Fixtures",
        email: "fidelity-auth-roles@dev.invalid",
        businessType: "Development Fixture",
        users: {
          create: roleUserIds.map(user => ({
            authUserId: user.authUserId,
            email: user.email,
            name: user.name,
            role: user.role,
            passwordSetupRequired: false,
          })),
        },
      },
      select: { id: true },
    })
  })
  console.log(`  ✓ Auth role fixtures: ${roleBusiness.id} (admin + sellador)`)

  console.log("Seed complete!")
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
