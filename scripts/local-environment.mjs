import { execFileSync, spawn } from "node:child_process"
import { parseEnv } from "node:util"
import { createHmac, randomBytes } from "node:crypto"

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env })
    child.once("error", reject)
    child.once("exit", (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(" ")} terminó con ${signal ?? code}`))
    })
  })
}

async function main() {
  const mode = process.argv[2]
  if (!["setup", "dev", "test"].includes(mode)) {
    throw new Error("Usa pnpm local:setup, pnpm local:dev o pnpm local:test")
  }

  await run("docker", ["info", "--format", "{{.ServerVersion}}"])
  console.log("Iniciando Supabase local…")
  execFileSync("supabase", ["start", "-o", "env"], { stdio: ["ignore", "pipe", "inherit"] })

  const status = parseEnv(execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" }))
  for (const name of ["API_URL", "DB_URL", "MAILPIT_URL"]) {
    const url = new URL(status[name] ?? "")
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      throw new Error(`Supabase devolvió una URL no local en ${name}`)
    }
  }
  if (!status.ANON_KEY || !status.SERVICE_ROLE_KEY) {
    throw new Error("Faltan las claves de Supabase local")
  }

  const env = {
    ...process.env,
    DATABASE_URL: status.DB_URL,
    DIRECT_URL: status.DB_URL,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    NEXT_PUBLIC_BASE_URL: "http://localhost:3000",
    KODA_LOCAL_ENVIRONMENT: "true",
    FID_WALLET_ENABLED: "false",
    FID_DEBUG_AUTH: "false",
    INVITE_ONLY: "false",
    SMTP_HOST: "",
    SMTP_USER: "",
    SMTP_PASS: "",
    NEXT_TELEMETRY_DISABLED: "1",
    // Cada corrida de pruebas usa sus propios contadores de Auth en la base local.
    AUTH_SECURITY_SECRET: mode === "test"
      ? randomBytes(32).toString("hex")
      : createHmac("sha256", status.SERVICE_ROLE_KEY).update("koda-local-auth").digest("hex"),
    CRON_SECRET: "",
    SUPABASE_PRIVATE_AVATAR_BUCKET: "avatars",
    SUPABASE_STORAGE_BUCKET: "pass-images",
    MAILPIT_URL: status.MAILPIT_URL,
  }

  await run("pnpm", ["exec", "prisma", "generate"], env)
  await run("pnpm", ["exec", "prisma", "migrate", "deploy"], env)
  await run("pnpm", ["exec", "tsx", "scripts/prepare-local-environment.ts"], env)

  if (mode === "dev") {
    await run("pnpm", ["exec", "next", "dev", "--hostname", "localhost"], env)
  }
  if (mode === "test") {
    await run("pnpm", ["build"], env)
    await run("pnpm", ["exec", "playwright", "test", "--config=playwright.auth.config.ts", "e2e/local-environment.spec.ts"], env)
  }
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
