import { describe, expect, it, vi } from "vitest"
import { ensureSeedAuthUser, seedPassword, seedRoleUsers } from "./seed-auth"

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
})
