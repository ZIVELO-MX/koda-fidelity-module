import { parseFidelityEnvironment, type FidelityEnvironment } from "./fidelity-admin-query"

export function chooseBillingEnvironment(value: string): FidelityEnvironment {
  return parseFidelityEnvironment(value)
}

export function assertBillingEnvironmentConfirmation(environment: FidelityEnvironment, confirmation: string, host: string) {
  if (environment === "production" && confirmation !== host) {
    throw new Error("La confirmación de producción no coincide; no se hicieron cambios")
  }
}

export function formatBillingEnvironmentSummary(environment: FidelityEnvironment, host: string) {
  const label = environment === "development" ? "DESARROLLO" : "PRODUCCION"
  return [`  Entorno: ${label}`, `  Base de datos: ${host}`].join("\n")
}
