export type SeedRole = "admin" | "sellador"

export type SeedRoleUser = {
  email: string
  name: string
  role: SeedRole
  passwordEnv: "DEV_SEED_ADMIN_PASSWORD" | "DEV_SEED_SELLADOR_PASSWORD"
}

export const seedRoleUsers: readonly SeedRoleUser[] = [
  {
    email: "fidelity.seed.admin@dev.invalid",
    name: "Fidelity Seed Admin",
    role: "admin",
    passwordEnv: "DEV_SEED_ADMIN_PASSWORD",
  },
  {
    email: "fidelity.seed.sellador@dev.invalid",
    name: "Fidelity Seed Sellador",
    role: "sellador",
    passwordEnv: "DEV_SEED_SELLADOR_PASSWORD",
  },
]

type AdminUser = { id: string; email?: string | null }

type SeedAuthAdmin = {
  listUsers: () => Promise<{ data: { users: AdminUser[] } | null; error: { message: string } | null }>
  createUser: (input: { email: string; password: string; email_confirm: boolean; user_metadata: { name: string } }) => Promise<{ data: { user: AdminUser | null } | null; error: { message: string } | null }>
  updateUserById: (id: string, input: { password: string; email_confirm: boolean; user_metadata: { name: string } }) => Promise<{ data: { user: AdminUser | null } | null; error: { message: string } | null }>
}

export function seedPassword(env: Record<string, string | undefined>, user: SeedRoleUser): string {
  const password = env[user.passwordEnv]
  if (!password || password.length < 8) {
    throw new Error(`${user.passwordEnv} must be set with at least 8 characters for development seed users`)
  }
  return password
}

export async function ensureSeedAuthUser(admin: SeedAuthAdmin, user: SeedRoleUser, password: string): Promise<string> {
  const listed = await admin.listUsers()
  if (listed.error) throw new Error(`Unable to list Supabase seed users: ${listed.error.message}`)

  const existing = listed.data?.users.find((candidate) => candidate.email?.toLowerCase() === user.email)
  if (existing) {
    const updated = await admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { name: user.name },
    })
    if (updated.error) throw new Error(`Unable to update Supabase seed user: ${updated.error.message}`)
    return existing.id
  }

  const created = await admin.createUser({
    email: user.email,
    password,
    email_confirm: true,
    user_metadata: { name: user.name },
  })
  if (created.error) throw new Error(`Unable to create Supabase seed user: ${created.error.message}`)
  if (!created.data?.user?.id) throw new Error("Supabase seed user was created without an id")
  return created.data.user.id
}
