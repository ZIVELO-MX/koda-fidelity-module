import { PrismaClient } from "@prisma/client"
import { createAdminClient } from "../lib/supabase-admin"

const prisma = new PrismaClient()
const admin = createAdminClient().auth.admin
const email = process.env.E2E_REQUIRED_EMAIL ?? "fidelity.seed.required@dev.invalid"
const password = process.env.E2E_REQUIRED_PASSWORD ?? "ci-required-password"
const portalEmail = process.env.E2E_PORTAL_EMAIL ?? "fidelity.seed.portal@dev.invalid"
const portalPassword = process.env.E2E_PORTAL_PASSWORD ?? "ci-portal-password"
const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? "fidelity.seed.customer@dev.invalid"
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? "ci-customer-password"
const expiredEmail = process.env.E2E_EXPIRED_EMAIL ?? "fidelity.seed.expired@dev.invalid"
const expiredPassword = process.env.E2E_EXPIRED_PASSWORD ?? "ci-expired-password"
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

  if (portalPassword.length < 8) throw new Error("E2E_PORTAL_PASSWORD must be at least 8 characters")
  const portalListed = await admin.listUsers({ page: 1, perPage: 100 })
  if (portalListed.error) throw new Error(`Unable to list portal fixture: ${portalListed.error.message}`)
  const portalExisting = portalListed.data.users.find(user => user.email?.toLowerCase() === portalEmail.toLowerCase())
  const portalResult = portalExisting
    ? await admin.updateUserById(portalExisting.id, { password: portalPassword, email_confirm: true, user_metadata: { name: "Fidelity Portal Fixture", must_change_password: false } })
    : await admin.createUser({ email: portalEmail, password: portalPassword, email_confirm: true, user_metadata: { name: "Fidelity Portal Fixture", must_change_password: false } })
  if (portalResult.error) throw new Error(`Unable to prepare portal fixture: ${portalResult.error.message}`)
  const portalAuthUserId = portalResult.data.user?.id
  if (!portalAuthUserId) throw new Error("Portal fixture was prepared without an id")
  await prisma.user.upsert({
    where: { email: portalEmail },
    create: { email: portalEmail, name: "Fidelity Portal Fixture", role: "sellador", businessId, authUserId: portalAuthUserId, passwordSetupRequired: false },
    update: { name: "Fidelity Portal Fixture", role: "sellador", businessId, authUserId: portalAuthUserId, passwordSetupRequired: false },
  })
  console.log(`Prepared portal fixture: ${portalEmail}`)

  if (customerPassword.length < 8) throw new Error("E2E_CUSTOMER_PASSWORD must be at least 8 characters")
  const customerListed = await admin.listUsers({ page: 1, perPage: 100 })
  if (customerListed.error) throw new Error(`Unable to list customer fixture: ${customerListed.error.message}`)
  const customerExisting = customerListed.data.users.find(user => user.email?.toLowerCase() === customerEmail.toLowerCase())
  const customerResult = customerExisting
    ? await admin.updateUserById(customerExisting.id, { password: customerPassword, email_confirm: true, user_metadata: { name: "Fidelity Customer Fixture", must_change_password: false } })
    : await admin.createUser({ email: customerEmail, password: customerPassword, email_confirm: true, user_metadata: { name: "Fidelity Customer Fixture", must_change_password: false } })
  if (customerResult.error) throw new Error(`Unable to prepare customer fixture: ${customerResult.error.message}`)
  console.log(`Prepared auth-only customer fixture: ${customerEmail}`)

  if (expiredPassword.length < 8) throw new Error("E2E_EXPIRED_PASSWORD must be at least 8 characters")
  const expiredListed = await admin.listUsers({ page: 1, perPage: 100 })
  if (expiredListed.error) throw new Error(`Unable to list expired fixture: ${expiredListed.error.message}`)
  const expiredExisting = expiredListed.data.users.find(user => user.email?.toLowerCase() === expiredEmail.toLowerCase())
  const expiredResult = expiredExisting
    ? await admin.updateUserById(expiredExisting.id, { password: expiredPassword, email_confirm: true, user_metadata: { name: "Fidelity Expired Recovery Fixture", must_change_password: false } })
    : await admin.createUser({ email: expiredEmail, password: expiredPassword, email_confirm: true, user_metadata: { name: "Fidelity Expired Recovery Fixture", must_change_password: false } })
  if (expiredResult.error) throw new Error(`Unable to prepare expired fixture: ${expiredResult.error.message}`)
  console.log(`Prepared expired-recovery fixture: ${expiredEmail}`)
}

main()
  .catch(error => {
    console.error("Failed to prepare auth E2E fixture:", error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
