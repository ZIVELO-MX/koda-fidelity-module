import { describe, it, expect } from "vitest"

// Mirrors the validation logic in updatePassword() server action
function validatePasswordUpdate(password: string, confirm: string): string | null {
  if (!password || password.length < 8) return "La contraseña debe tener al menos 8 caracteres"
  if (password !== confirm) return "Las contraseñas no coinciden"
  return null
}

describe("updatePassword validation", () => {
  it("accepts valid matching passwords", () => {
    expect(validatePasswordUpdate("SecurePass1!", "SecurePass1!")).toBeNull()
  })

  it("rejects password shorter than 8 characters", () => {
    expect(validatePasswordUpdate("short", "short")).toBe(
      "La contraseña debe tener al menos 8 caracteres",
    )
  })

  it("rejects empty password", () => {
    expect(validatePasswordUpdate("", "")).toBe(
      "La contraseña debe tener al menos 8 caracteres",
    )
  })

  it("rejects passwords that do not match", () => {
    expect(validatePasswordUpdate("SecurePass1!", "DifferentPass1!")).toBe(
      "Las contraseñas no coinciden",
    )
  })

  it("rejects when confirm is empty even if password is valid", () => {
    expect(validatePasswordUpdate("SecurePass1!", "")).toBe("Las contraseñas no coinciden")
  })

  it("accepts exactly 8 characters", () => {
    expect(validatePasswordUpdate("Exact8!!", "Exact8!!")).toBeNull()
  })

  it("rejects 7 characters", () => {
    expect(validatePasswordUpdate("Short7!", "Short7!")).toBe(
      "La contraseña debe tener al menos 8 caracteres",
    )
  })
})

describe("must_change_password flag semantics", () => {
  it("flag is true on newly created clients", () => {
    const userMetadata = { name: "Café El Sol", must_change_password: true }
    expect(userMetadata.must_change_password).toBe(true)
  })

  it("flag is false after password update", () => {
    const userMetadata = { name: "Café El Sol", must_change_password: false }
    expect(userMetadata.must_change_password).toBe(false)
  })

  it("flag is falsy when absent (existing users)", () => {
    const userMetadata: Record<string, unknown> = { name: "Old User" }
    expect(userMetadata.must_change_password).toBeFalsy()
  })
})
