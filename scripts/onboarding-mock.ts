import dotenv from "dotenv"
import { spawn } from "node:child_process"
import { resolve } from "node:path"
import { createAdminClient } from "../lib/supabase-admin"
import { PrismaClient } from "@prisma/client"
import { config } from "../lib/config"

type ParsedArgs = { email: string; port: number }

export function parseMockArgs(argv: readonly string[]): ParsedArgs {
  const args = argv.filter((arg) => arg !== "--")
  const email = args[0]
  let port = 3000
  for (let i = 1; i < args.length; i += 1) {
    if (args[i] !== "--port" || !args[i + 1]) throw new Error("Uso: pnpm onboarding:mock -- <email> [--port <puerto>]")
    port = Number(args[i + 1])
    i += 1
  }
  if (!email || !email.includes("@")) throw new Error("Uso: pnpm onboarding:mock -- <email> [--port <puerto>]")
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("El puerto debe ser un entero entre 1 y 65535")
  return { email: email.toLowerCase(), port }
}

async function assertDevelopmentFixture(email: string) {
  if (!config.isDebugAuthEnabled) throw new Error("El onboarding mock requiere FID_DEBUG_AUTH=true fuera de producción")
  const admin = createAdminClient().auth.admin
  const listed = await admin.listUsers({ page: 1, perPage: 1000 })
  if (listed.error) throw new Error(`Auth lookup failed: ${listed.error.message}`)
  const authUser = listed.data.users.find((user) => user.email?.toLowerCase() === email)
  if (!authUser) throw new Error(`Auth user not found: ${email}`)

  const prisma = new PrismaClient()
  try {
    const [user, categories, themes] = await Promise.all([
      prisma.user.findUnique({ where: { authUserId: authUser.id }, select: { id: true } }),
      prisma.businessCategory.count({ where: { isActive: true } }),
      prisma.loyaltyTheme.count({ where: { isActive: true } }),
    ])
    if (!user) throw new Error(`Application user not found: ${email}`)
    if (!categories) throw new Error("El catálogo de categorías está vacío; prepara development antes del mock")
    if (!themes) throw new Error("El catálogo de temas está vacío; prepara development antes del mock")
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  dotenv.config({ path: resolve(process.cwd(), ".env.development.local") })
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") throw new Error("El onboarding mock solo puede ejecutarse en development")
  const { email, port } = parseMockArgs(process.argv.slice(2))
  await assertDevelopmentFixture(email)

  const nextBin = resolve(process.cwd(), "node_modules/next/dist/bin/next")
  const child = spawn(process.execPath, [nextBin, "dev", "--port", String(port)], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development", FID_DEBUG_AUTH: "true", FID_ONBOARDING_MOCK_EMAIL: email },
  })
  console.log(`Onboarding mock activo para ${email}`)
  console.log(`Datos en memoria; se descartan al detener el proceso.`)
  console.log(`Abre http://localhost:${port}/onboarding después de iniciar sesión.`)

  const stop = (signal: NodeJS.Signals) => child.kill(signal)
  process.once("SIGINT", () => stop("SIGINT"))
  process.once("SIGTERM", () => stop("SIGTERM"))
  child.once("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    process.exitCode = code ?? 1
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unexpected onboarding mock error")
  process.exitCode = 1
})
