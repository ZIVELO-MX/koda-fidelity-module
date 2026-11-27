import { PrismaClient } from "@prisma/client"
import { createAdminClient } from "../lib/supabase-admin"
import { ensureSeedAuthUser, seedRoleUsers } from "../prisma/seed-auth"

const prisma = new PrismaClient()

async function main() {
  for (const name of ["DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL"] as const) {
    const host = new URL(process.env[name] ?? "").hostname
    if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
      throw new Error(`El fixture local rechaza ${name} fuera de loopback`)
    }
  }

  const supabase = createAdminClient()
  const operator = { ...seedRoleUsers[0], email: "operator.local@dev.invalid", name: "Operador local" }
  const authUserId = await ensureSeedAuthUser(supabase.auth.admin, operator, "KodaLocal123!")
  const businessId = "business-local-fidelity"
  const cardId = "card-local-fidelity"

  await prisma.$transaction(async tx => {
    await tx.business.upsert({
      where: { id: businessId },
      create: { id: businessId, name: "Koda Local", email: operator.email },
      update: {},
    })
    await tx.user.upsert({
      where: { authUserId },
      create: {
        authUserId,
        email: operator.email,
        name: operator.name,
        role: operator.role,
        businessId,
        passwordSetupRequired: false,
      },
      update: { businessId, passwordSetupRequired: false },
    })
    await tx.loyaltyCard.upsert({
      where: { id: cardId },
      create: { id: cardId, businessId, name: "Café local", reward: "Café gratis", stampsRequired: 2 },
      update: {},
    })
  })

  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw error
  for (const [name, isPublic] of [["avatars", false], ["pass-images", true]] as const) {
    if (buckets.some(bucket => bucket.name === name && bucket.public === isPublic)) continue
    const result = buckets.some(bucket => bucket.name === name)
      ? await supabase.storage.updateBucket(name, { public: isPublic })
      : await supabase.storage.createBucket(name, { public: isPublic })
    if (result.error) throw result.error
  }

  console.log(`Operador: ${operator.email} · Tarjeta: /join/${cardId}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
