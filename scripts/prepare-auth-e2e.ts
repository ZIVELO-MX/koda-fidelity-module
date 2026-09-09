import { PrismaClient } from "@prisma/client"
import { createAdminClient } from "../lib/supabase-admin"

const prisma = new PrismaClient()
const admin = createAdminClient().auth.admin
const email = process.env.E2E_REQUIRED_EMAIL ?? "fidelity.seed.required@dev.invalid"
const password = process.env.E2E_REQUIRED_PASSWORD ?? "ci-required-password"
const businessId = "biz-fidelity-auth-roles"

async function main() {
  if (password.length < 8) throw new Error("E2E_REQUIRED_PASSWORD must be at least 8 characters")

  const listed = await admin.listUsers({ page: 1, perPage: 100 })
  if (listed.error) throw new Error(`Unable to list E2E Auth users: ${listed.error.message}`)
  const existing = listed.data.users.find(user => user.email?.toLowerCase() === email.toLowerCase())
  const result = existing
    ? await admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { name: "Fidelity Required Password", must_change_password: true },
      })
    : await admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: "Fidelity Required Password", must_change_password: true },
      })
  if (result.error) throw new Error(`Unable to prepare E2E Auth user: ${result.error.message}`)
  const authUserId = result.data.user?.id
  if (!authUserId) throw new Error("E2E Auth user was prepared without an id")

  await prisma.user.upsert({
    where: { email },
    create: { email, name: "Fidelity Required Password", role: "sellador", businessId, authUserId, passwordSetupRequired: true },
    update: { name: "Fidelity Required Password", role: "sellador", businessId, authUserId, passwordSetupRequired: true },
  })
  console.log(`Prepared required-password fixture: ${email}`)
}

main()
  .catch(error => {
    console.error("Failed to prepare auth E2E fixture:", error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
