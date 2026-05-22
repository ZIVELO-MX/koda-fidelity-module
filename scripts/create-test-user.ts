import { createAdminClient } from "../lib/supabase-admin"

const TEST_EMAIL = "test@kodafidelity.com"
const TEST_PASSWORD = "Test123!"
const TEST_NAME = "Café de Prueba"

async function main() {
  const supabase = createAdminClient()

  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const alreadyExists = existingUsers?.users.find((u) => u.email === TEST_EMAIL)

  if (alreadyExists) {
    console.log(`Test user already exists: ${TEST_EMAIL}`)
    console.log(`ID: ${alreadyExists.id}`)
    return
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { name: TEST_NAME },
  })

  if (error) {
    console.error("Failed to create test user:", error.message)
    process.exit(1)
  }

  console.log(`Test user created: ${TEST_EMAIL}`)
  console.log(`ID: ${data.user.id}`)
  console.log(`Password: ${TEST_PASSWORD}`)

  console.log("\nUser can now be used for E2E tests.")
  console.log(`Email: ${TEST_EMAIL}`)
  console.log(`Password: ${TEST_PASSWORD}`)
}

main()
