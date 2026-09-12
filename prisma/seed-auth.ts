export type SeedRole = "admin" | "sellador"

export type SeedRoleUser = {
  email: string
  name: string
  role: SeedRole
  passwordEnv: "DEV_SEED_ADMIN_PASSWORD" | "DEV_SEED_SELLADOR_PASSWORD" | "DEV_SEED_GENERIC_PASSWORD"
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

const AUTH_PAGE_SIZE = 1000

type SeedAuthAdmin = {
  listUsers: (params?: { page?: number; perPage?: number }) => Promise<{ data: { users: AdminUser[] } | null; error: { message: string } | null }>
  createUser: (input: { email: string; password: string; email_confirm: boolean; user_metadata: { name: string; must_change_password?: boolean } }) => Promise<{ data: { user: AdminUser | null } | null; error: { message: string } | null }>
  updateUserById: (id: string, input: { password?: string; email_confirm: boolean; user_metadata: { name: string; must_change_password?: boolean } }) => Promise<{ data: { user: AdminUser | null } | null; error: { message: string } | null }>
}

export function seedPassword(env: Record<string, string | undefined>, user: SeedRoleUser): string {
  const password = env[user.passwordEnv]
  if (!password || password.length < 8) {
    throw new Error(`${user.passwordEnv} must be set with at least 8 characters for development seed users`)
  }
  return password
}

export async function resolveSeedRoleUsers(
  admin: SeedAuthAdmin,
  env: Record<string, string | undefined>,
): Promise<Array<SeedRoleUser & { authUserId: string }>> {
  const usersWithPasswords = seedRoleUsers.map(user => ({ user, password: seedPassword(env, user) }))
  return Promise.all(usersWithPasswords.map(async ({ user, password }) => ({
    ...user,
    authUserId: await ensureSeedAuthUser(admin, user, password),
  })))
}

export async function ensureSeedAuthUser(admin: SeedAuthAdmin, user: SeedRoleUser, password: string, mustChangePassword = false, preserveExistingPassword = false): Promise<string> {
  for (let page = 1; ; page += 1) {
    const listed = await admin.listUsers({ page, perPage: AUTH_PAGE_SIZE })
    if (listed.error) throw new Error(`Unable to list Supabase seed users: ${listed.error.message}`)
    if (!listed.data) throw new Error("Unable to list Supabase seed users: response contained no data")

    const existing = listed.data.users.find((candidate) => candidate.email?.toLowerCase() === user.email)
    if (existing) {
      const updated = await admin.updateUserById(existing.id, {
        ...(preserveExistingPassword ? {} : { password }),
        email_confirm: true,
        user_metadata: { name: user.name, must_change_password: mustChangePassword },
      })
      if (updated.error) throw new Error(`Unable to update Supabase seed user: ${updated.error.message}`)
      return existing.id
    }

    if (listed.data.users.length < AUTH_PAGE_SIZE) break
  }

  const created = await admin.createUser({
    email: user.email,
    password,
    email_confirm: true,
    user_metadata: { name: user.name, must_change_password: mustChangePassword },
  })
  if (created.error) throw new Error(`Unable to create Supabase seed user: ${created.error.message}`)
  if (!created.data?.user?.id) throw new Error("Supabase seed user was created without an id")
  return created.data.user.id
}
