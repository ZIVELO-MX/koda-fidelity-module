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
}

main()
  .catch((error) => {
    if (error instanceof CliInputError) {
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
