import { PrismaClient } from "@prisma/client"
import { mockData } from "./mock-data"
import { createAdminClient } from "../lib/supabase-admin"
import { ensureSeedAuthUser, seedPassword, seedRoleUsers } from "./seed-auth"

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error("Refusing destructive seed in production. Set ALLOW_DESTRUCTIVE_SEED=true explicitly.")
  }
  console.log("Seeding database...")

  await prisma.$transaction(async tx => {
    await tx.stampLog.deleteMany()
    await tx.customer.deleteMany()
    await tx.loyaltyCard.deleteMany()
    await tx.business.deleteMany()

    for (const biz of mockData.businesses) {
      await tx.business.create({ data: biz })
      console.log(`  ✓ Business: ${biz.name}`)
    }

    for (const cust of mockData.customers) {
      await tx.customer.create({ data: cust })
      console.log(`  ✓ Customer: ${cust.name} (${cust.stamps}/${cust.cardId})`)
    }
  })

  const authAdmin = createAdminClient().auth.admin
  const roleUserIds = await Promise.all(seedRoleUsers.map(async user => ({
    ...user,
    authUserId: await ensureSeedAuthUser(authAdmin, user, seedPassword(process.env, user)),
  })))

  const roleBusiness = await prisma.business.create({
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
  console.log(`  ✓ Auth role fixtures: ${roleBusiness.id} (admin + sellador)`)

  console.log("Seed complete!")
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
