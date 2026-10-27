import { describe, expect, it } from "vitest"
import { assertBillingEnvironmentConfirmation, chooseBillingEnvironment, formatBillingEnvironmentSummary } from "./billing-manage-user-config"

describe("configuración de billing:manage-user", () => {
  it.each([
    ["DESARROLLO", "development"],
    ["PRODUCCION", "production"],
  ])("selecciona el entorno %s antes de conectar", (input, expected) => {
    expect(chooseBillingEnvironment(input)).toBe(expected)
  })

  it("incluye entorno y host en el resumen sin imprimir credenciales ni URL", () => {
    const summary = formatBillingEnvironmentSummary("production", "db.example.com:5432")

    expect(summary).toContain("Entorno: PRODUCCION")
    expect(summary).toContain("Base de datos: db.example.com:5432")
    expect(summary).not.toContain("postgresql://")
    expect(summary).not.toContain("secret")
  })

  it("requires the exact database host to confirm production", () => {
    expect(() => assertBillingEnvironmentConfirmation("production", "other.example.com:5432", "db.example.com:5432"))
      .toThrow("La confirmación de producción no coincide")
    expect(() => assertBillingEnvironmentConfirmation("production", "db.example.com:5432", "db.example.com:5432"))
      .not.toThrow()
    expect(() => assertBillingEnvironmentConfirmation("development", "", "dev.example.com:5432"))
      .not.toThrow()
  })
})
