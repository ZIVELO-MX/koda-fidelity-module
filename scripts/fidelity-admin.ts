import dotenv from "dotenv"
import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import type { PrismaClient } from "@prisma/client"
import {
  databaseHost,
  fidelityEnvFile,
  formatAdminLookup,
  parseFidelityEnvironment,
  queryAdminAccount,
  type FidelityEnvironment,
} from "./fidelity-admin-query"
import { changePlanThroughApi, parsePlan, PlanApiError } from "./fidelity-admin-plan"

const readline = createInterface({ input, output })
let prisma: PrismaClient | undefined
let environmentName = ""
let databaseHostName = ""

class CliInputError extends Error {}

async function ask(label: string) {
  return (await readline.question(label)).trim()
}

function safeErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return ""
  const record = error as { code?: unknown; errorCode?: unknown }
  const code = typeof record.errorCode === "string" ? record.errorCode : record.code
  return typeof code === "string" && /^[A-Z0-9]+$/.test(code) ? ` (${code})` : ""
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--")
  const changePlan = args[0] === "set-plan"
  if (args.length > (changePlan ? 1 : 0)) throw new CliInputError("Uso: pnpm fidelity:admin [-- set-plan]")
  let environment: FidelityEnvironment
  try {
    environment = parseFidelityEnvironment(await ask("Entorno (DESARROLLO|PRODUCCION): "))
  } catch (error) {
    throw new CliInputError(error instanceof Error ? error.message : "Entorno inválido")
  }
  environmentName = environment === "development" ? "DESARROLLO" : "PRODUCCIÓN"

  const envPath = fidelityEnvFile(environment, process.cwd())
  const loaded = dotenv.config({ path: envPath, override: true, quiet: true })
  if (loaded.error) throw new CliInputError(`No se pudo cargar ${envPath}`)
  const configuredUrl = process.env.DATABASE_URL?.trim()
  if (!configuredUrl) throw new CliInputError(`DATABASE_URL no está configurada en ${envPath}`)

  let url: URL
  try {
    url = new URL(configuredUrl)
  } catch {
    throw new CliInputError("DATABASE_URL no contiene una URL válida")
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new CliInputError("DATABASE_URL debe usar PostgreSQL")
  }
  databaseHostName = databaseHost(configuredUrl)
  // One connection is sufficient for these small support lookups and works
  // reliably with Supavisor's shared transaction pooler.
  url.searchParams.set("connection_limit", "1")
  process.env.DATABASE_URL = url.toString()
  console.log(`\nEntorno: ${environmentName} · Base de datos: ${databaseHostName}`)

  const email = (await ask("Correo del admin: ")).toLowerCase()
  if (!email || !email.includes("@")) throw new CliInputError("Escribe un correo válido")

  const client = await import("../lib/prisma")
  prisma = client.prisma
  const result = await queryAdminAccount(prisma, email)
  console.log(`\n${formatAdminLookup(result)}`)
  if (!changePlan) return
  if (result.kind !== "business") throw new CliInputError("El correo debe pertenecer a un admin con negocio vinculado")
  if (result.subscription?.status !== "ACTIVE") throw new CliInputError("El negocio necesita una suscripción activa")
  let plan: "LITE" | "PRO"
  try {
    plan = parsePlan(await ask("Nuevo plan (LITE|PRO): "))
  } catch (error) {
    throw new CliInputError(error instanceof Error ? error.message : "Plan inválido")
  }
  if (result.subscription.plan === plan) throw new CliInputError(`La suscripción ya tiene el plan ${plan}`)
  const secret = process.env.BILLING_INTERNAL_SECRET?.trim()
  if (!secret) throw new CliInputError(`BILLING_INTERNAL_SECRET no está configurado en ${envPath}`)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (!baseUrl) throw new CliInputError(`NEXT_PUBLIC_BASE_URL no está configurada en ${envPath}`)
  const operator = process.env.BILLING_OPERATOR?.trim() || "fidelity-admin-cli"
  console.log(`\nCambio: ${result.business.name} (${result.business.id}) · ${result.subscription.plan} → ${plan} · ${result.subscription.billingInterval}`)
  if ((await ask("Escribe CAMBIAR para aplicar: ")) !== "CAMBIAR") {
    console.log("Cambio cancelado")
    return
  }
  await changePlanThroughApi({
    baseUrl,
    secret,
    businessId: result.business.id,
    plan,
    billingInterval: result.subscription.billingInterval as "MONTHLY" | "ANNUAL",
    operator,
  })
  const verified = await queryAdminAccount(prisma, email)
  if (verified.kind !== "business" || verified.subscription?.plan !== plan || verified.subscription.status !== "ACTIVE") {
    throw new Error("La API aceptó el cambio, pero la lectura de la base aún no lo confirma")
  }
  console.log(`Plan confirmado: ${verified.business.name} · ${verified.subscription.plan}/${verified.subscription.billingInterval}`)
}

main()
  .catch((error) => {
    if (error instanceof CliInputError || error instanceof PlanApiError) {
      console.error(error.message)
      process.exitCode = 1
      return
    }
    const location = environmentName
      ? ` en ${environmentName}${databaseHostName ? ` (${databaseHostName})` : ""}`
      : ""
    console.error(`Error al consultar Fidelity${location}${safeErrorCode(error)}. Revisa el entorno y la conexión configurados.`)
    process.exitCode = 1
  })
  .finally(async () => {
    readline.close()
    if (prisma) await prisma.$disconnect()
  })
