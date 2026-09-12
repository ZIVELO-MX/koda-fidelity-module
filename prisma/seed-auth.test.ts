import { describe, expect, it, vi } from "vitest"
import { ensureSeedAuthUser, resolveSeedRoleUsers, seedPassword, seedRoleUsers } from "./seed-auth"

describe("development auth seed", () => {
  it("defines one stable user for each supported business role", () => {
    expect(seedRoleUsers.map(user => user.role)).toEqual(["admin", "sellador"])
    expect(new Set(seedRoleUsers.map(user => user.email)).size).toBe(2)
    expect(seedRoleUsers.every(user => user.email.endsWith("@dev.invalid"))).toBe(true)
  })

  it("requires non-trivial passwords from the local environment", () => {
    expect(seedPassword({ DEV_SEED_ADMIN_PASSWORD: "long-enough" }, seedRoleUsers[0])).toBe("long-enough")
    expect(() => seedPassword({}, seedRoleUsers[0])).toThrow("DEV_SEED_ADMIN_PASSWORD")
    expect(() => seedPassword({ DEV_SEED_ADMIN_PASSWORD: "short" }, seedRoleUsers[0])).toThrow("at least 8")
  })

  it("creates a missing Auth user and updates an existing one idempotently", async () => {
    const admin = {
      listUsers: vi.fn()
        .mockResolvedValueOnce({ data: { users: [] }, error: null })
        .mockResolvedValueOnce({ data: { users: [{ id: "auth-existing", email: seedRoleUsers[0].email }] }, error: null }),
      createUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-created" } }, error: null }),
      updateUserById: vi.fn().mockResolvedValue({ data: { user: { id: "auth-existing" } }, error: null }),
    }

    await expect(ensureSeedAuthUser(admin, seedRoleUsers[0], "long-enough")).resolves.toBe("auth-created")
    await expect(ensureSeedAuthUser(admin, seedRoleUsers[0], "long-enough")).resolves.toBe("auth-existing")
    expect(admin.createUser).toHaveBeenCalledTimes(1)
    expect(admin.updateUserById).toHaveBeenCalledWith("auth-existing", expect.objectContaining({ email_confirm: true }))
  })

  it("finds an existing user on a later Auth page", async () => {
    const admin = {
      listUsers: vi.fn()
        .mockResolvedValueOnce({ data: { users: Array.from({ length: 1000 }, (_, index) => ({ id: `auth-${index}`, email: `user-${index}@dev.invalid` })) }, error: null })
        .mockResolvedValueOnce({ data: { users: [{ id: "auth-page-two", email: seedRoleUsers[0].email }] }, error: null }),
      createUser: vi.fn(),
      updateUserById: vi.fn().mockResolvedValue({ data: { user: { id: "auth-page-two" } }, error: null }),
    }

    await expect(ensureSeedAuthUser(admin, seedRoleUsers[0], "long-enough")).resolves.toBe("auth-page-two")
    expect(admin.listUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: 1000 })
    expect(admin.listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 1000 })
    expect(admin.createUser).not.toHaveBeenCalled()
  })

  it("refreshes metadata for an existing user without replacing a preserved password", async () => {
    const admin = {
      listUsers: vi.fn().mockResolvedValue({ data: { users: [{ id: "auth-existing", email: "benjamin.rodriguez@zivelo.dev" }] }, error: null }),
      createUser: vi.fn(),
      updateUserById: vi.fn().mockResolvedValue({ data: { user: { id: "auth-existing" } }, error: null }),
    }

    await expect(ensureSeedAuthUser(admin, { email: "benjamin.rodriguez@zivelo.dev", name: "Benjamin Rodríguez", role: "admin", passwordEnv: "DEV_SEED_GENERIC_PASSWORD" }, "generic-password", true, true)).resolves.toBe("auth-existing")
    expect(admin.updateUserById).toHaveBeenCalledWith("auth-existing", {
      email_confirm: true,
      user_metadata: { name: "Benjamin Rodríguez", must_change_password: true },
    })
  })

  it("does not write Auth users when any seed password is missing", async () => {
    const admin = {
      listUsers: vi.fn(),
      createUser: vi.fn(),
      updateUserById: vi.fn(),
    }

    await expect(resolveSeedRoleUsers(admin, { DEV_SEED_ADMIN_PASSWORD: "long-enough" })).rejects.toThrow("DEV_SEED_SELLADOR_PASSWORD")
    expect(admin.listUsers).not.toHaveBeenCalled()
    expect(admin.createUser).not.toHaveBeenCalled()
    expect(admin.updateUserById).not.toHaveBeenCalled()
  })

  it("stops on Auth listing errors without creating a replacement", async () => {
    const admin = {
      listUsers: vi.fn().mockResolvedValue({ data: null, error: { message: "provider unavailable" } }),
      createUser: vi.fn(),
      updateUserById: vi.fn(),
    }

    await expect(ensureSeedAuthUser(admin, seedRoleUsers[0], "long-enough")).rejects.toThrow("provider unavailable")
    expect(admin.createUser).not.toHaveBeenCalled()
  })

  it("stops when updating an existing Auth user fails", async () => {
    const admin = {
      listUsers: vi.fn().mockResolvedValue({ data: { users: [{ id: "auth-existing", email: seedRoleUsers[0].email }] }, error: null }),
      createUser: vi.fn(),
      updateUserById: vi.fn().mockResolvedValue({ data: null, error: { message: "update denied" } }),
    }

    await expect(ensureSeedAuthUser(admin, seedRoleUsers[0], "long-enough")).rejects.toThrow("update denied")
    expect(admin.createUser).not.toHaveBeenCalled()
  })
})
