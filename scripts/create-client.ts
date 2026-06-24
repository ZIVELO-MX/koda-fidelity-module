import "dotenv/config"
import { createAdminClient } from "../lib/supabase-admin"
import { PrismaClient } from "@prisma/client"
import { sendInviteEmail } from "./invite-email"

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = "Koda1234!"

function parseArgs(): { email: string; name: string; password: string; sendEmail: boolean; to?: string } {
  const args = process.argv.slice(2)
  const result: Record<string, string> = {}
  const flags = new Set<string>()
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2)
      if (key === "send-email") {
        flags.add(key)
        continue
      }
      result[key] = args[i + 1] ?? ""
      i++
    }
  }
  if (!result.email || !result.business) {
    console.error("Uso: pnpm create:client --email <email> --business <nombre> [--password <password>] [--send-email] [--to <override>]")
    console.error("Ejemplo: pnpm create:client --email cafe@ejemplo.com --business \"Café El Sol\" --send-email")
    process.exit(1)
  }
  return {
    email: result.email,
    name: result.business,
    password: result.password || DEFAULT_PASSWORD,
    sendEmail: flags.has("send-email"),
    to: result.to,
  }
}

async function main() {
  const { email, name, password, sendEmail, to } = parseArgs()
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
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (!existingUser) {
      await prisma.user.create({ data: { email, name, role: "admin", businessId: existingBusiness.id } })
      console.log(`Usuario admin creado para negocio existente: ${email}`)
    }
  } else {
    await prisma.business.create({
      data: {
        email,
        name,
        users: {
          create: { email, name, role: "admin" },
        },
      },
    })
    console.log(`Negocio y usuario admin creados: ${name}`)
  }

  console.log("\n--- Credenciales ---")
  console.log(`Email:      ${email}`)
  console.log(`Contraseña: ${password}`)
  console.log("\nEl cliente deberá cambiar su contraseña al iniciar sesión por primera vez.")

  if (sendEmail) {
    const recipient = to ?? email
    console.log(`\nEnviando invitación a ${recipient}...`)
    const messageId = await sendInviteEmail({ email, name, password, to })
    console.log(`Correo enviado. ID: ${messageId}`)
    console.log(`Destinatario: ${recipient}`)
  }
}

main().finally(() => prisma.$disconnect())
