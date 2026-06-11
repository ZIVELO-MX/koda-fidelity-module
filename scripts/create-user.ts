/**
 * Crea un colaborador dentro de un negocio existente.
 * El negocio se identifica por el email de su cuenta principal (Business.email).
 *
 * Uso:
 *   pnpm create:user --business <email-negocio> --email <email-usuario> --name <nombre> [--role admin|sellador] [--password <password>]
 *
 * Ejemplo:
 *   pnpm create:user --business cafe@ejemplo.com --email barista@ejemplo.com --name "Ana López"
 */

import "dotenv/config"
import { createAdminClient } from "../lib/supabase-admin"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = "Koda1234!"
const MEMBER_LIMIT = parseInt(process.env.TEAM_MEMBER_LIMIT ?? "3", 10)

type ParsedArgs = {
  businessEmail: string
  email: string
  name: string
  role: "admin" | "sellador"
  password: string
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2)
  const result: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      result[args[i].slice(2)] = args[i + 1] ?? ""
      i++
    }
  }

  if (!result.business || !result.email || !result.name) {
    console.error("Uso: pnpm create:user --business <email-negocio> --email <email-usuario> --name <nombre> [--role admin|sellador] [--password <password>]")
    console.error("Ejemplo: pnpm create:user --business cafe@ejemplo.com --email barista@ejemplo.com --name \"Ana López\"")
    process.exit(1)
  }

  const role = result.role ?? "sellador"
  if (role !== "admin" && role !== "sellador") {
    console.error("Error: --role debe ser 'admin' o 'sellador'")
    process.exit(1)
  }

  return {
    businessEmail: result.business,
    email: result.email,
    name: result.name,
    role: role as "admin" | "sellador",
    password: result.password || DEFAULT_PASSWORD,
  }
}

async function main() {
  const { businessEmail, email, name, role, password } = parseArgs()
  const supabase = createAdminClient()

  // Resolve business
  const business = await prisma.business.findUnique({ where: { email: businessEmail } })
  if (!business) {
    console.error(`Error: No existe ningún negocio con el email "${businessEmail}"`)
    process.exit(1)
  }
  console.log(`Negocio encontrado: ${business.name} (${business.id})`)

  // Check limit
  const memberCount = await prisma.user.count({ where: { businessId: business.id } })
  if (memberCount >= MEMBER_LIMIT) {
    console.error(`Error: El negocio ya alcanzó el límite de ${MEMBER_LIMIT} miembros (actualmente ${memberCount}).`)
    console.error(`Ajusta TEAM_MEMBER_LIMIT en .env si necesitas aumentar el límite.`)
    process.exit(1)
  }

  // Check email uniqueness in DB
  const existingDbUser = await prisma.user.findUnique({ where: { email } })
  if (existingDbUser) {
    console.error(`Error: Ya existe un usuario con el email "${email}" en la base de datos.`)
    process.exit(1)
  }

  // Create or reuse Supabase Auth user
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
  const existingAuth = authUsers.find((u) => u.email === email)

  if (existingAuth) {
    console.log(`El usuario de auth ya existe: ${email} — reutilizando.`)
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, must_change_password: true },
    })

    if (error) {
      console.error("Error al crear usuario en Supabase Auth:", error.message)
      process.exit(1)
    }

    console.log(`Usuario de auth creado: ${email} (${data.user.id})`)
  }

  // Create DB User
  const newUser = await prisma.user.create({
    data: { email, name: name.trim(), role, businessId: business.id },
    select: { id: true, email: true, name: true, role: true },
  })

  console.log(`\nColaborador creado: ${newUser.name} [${newUser.role}] en "${business.name}"`)
  console.log(`Miembros actuales: ${memberCount + 1} / ${MEMBER_LIMIT}`)
  console.log("\n--- Credenciales ---")
  console.log(`Email:      ${email}`)
  console.log(`Contraseña: ${password}`)
  console.log(`\nEl colaborador deberá cambiar su contraseña al iniciar sesión por primera vez.`)
}

main().finally(() => prisma.$disconnect())
