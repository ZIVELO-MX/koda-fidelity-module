import "dotenv/config"
import { createAdminClient } from "../lib/supabase-admin"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = "Koda1234!"

function parseArgs(): { email: string; name: string; password: string } {
  const args = process.argv.slice(2)
  const result: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      result[args[i].slice(2)] = args[i + 1] ?? ""
      i++
    }
  }
  if (!result.email || !result.name) {
    console.error("Uso: pnpm create:client --email <email> --name <nombre> [--password <password>]")
    console.error("Ejemplo: pnpm create:client --email cafe@ejemplo.com --name \"Café El Sol\"")
    process.exit(1)
  }
  return { email: result.email, name: result.name, password: result.password || DEFAULT_PASSWORD }
}

async function main() {
  const { email, name, password } = parseArgs()
  const supabase = createAdminClient()

  const { data: { users } } = await supabase.auth.admin.listUsers()
  const existingAuth = users.find((u) => u.email === email)

  if (existingAuth) {
    console.log(`El usuario de auth ya existe: ${email}`)
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, must_change_password: true },
    })

    if (error) {
      console.error("Error al crear usuario:", error.message)
      process.exit(1)
    }

    console.log(`Usuario de auth creado: ${email} (${data.user.id})`)
  }

  const existingBusiness = await prisma.business.findUnique({ where: { email } })
  if (existingBusiness) {
    console.log(`El negocio ya existe: ${name}`)
  } else {
    await prisma.business.create({ data: { email, name } })
    console.log(`Negocio creado: ${name}`)
  }

  console.log("\n--- Credenciales ---")
  console.log(`Email:      ${email}`)
  console.log(`Contraseña: ${password}`)
  console.log("\nEl cliente deberá cambiar su contraseña al iniciar sesión por primera vez.")
}

main().finally(() => prisma.$disconnect())
