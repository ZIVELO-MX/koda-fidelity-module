import "dotenv/config"
import { createAdminClient } from "../lib/supabase-admin"
import nodemailer from "nodemailer"
import { readFileSync } from "fs"
import { resolve } from "path"

const DEFAULT_PASSWORD = "Koda1234!"
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://fidelity.zivelo.dev"

function parseArgs(): { email: string; password: string; sendEmail: boolean } {
  const args = process.argv.slice(2)
  const result: Record<string, string> = {}
  const flags = new Set<string>()
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2)
      const next = args[i + 1]
      if (next && !next.startsWith("--")) {
        result[key] = next
        i++
      } else {
        flags.add(key)
      }
    }
  }
  if (!result.email) {
    console.error("Uso: pnpm reset:password --email <email> [--password <nueva-password>] [--send-email]")
    console.error("Ejemplo: pnpm reset:password --email cafe@ejemplo.com --send-email")
    process.exit(1)
  }
  return {
    email: result.email,
    password: result.password || DEFAULT_PASSWORD,
    sendEmail: flags.has("send-email"),
  }
}

function createMailTransporter() {
  const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]
  const missing = required.filter((k) => !process.env[k])
  if (missing.length) {
    console.error(`Faltan variables de entorno para email: ${missing.join(", ")}`)
    process.exit(1)
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_PORT !== "587",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

export async function sendPasswordResetEmail(
  email: string,
  password: string,
  transporter: nodemailer.Transporter
): Promise<void> {
  const loginUrl = `${BASE_URL}/login?email=${encodeURIComponent(email)}`
  const template = readFileSync(resolve("docs/email-templates/invite.html"), "utf-8")
  const html = template
    .replace(/{{NAME}}/g, email)
    .replace(/{{EMAIL}}/g, email)
    .replace(/{{PASSWORD}}/g, password)
    .replace(/{{LOGIN_URL}}/g, loginUrl)

  const info = await transporter.sendMail({
    from: `Koda Fidelity <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Tu contraseña fue restablecida — Koda Fidelity",
    html,
  })

  console.log(`Correo enviado. ID: ${info.messageId}`)
}

async function main() {
  const { email, password, sendEmail } = parseArgs()
  const supabase = createAdminClient()

  // 1. Find user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error("Error al listar usuarios:", listError.message)
    process.exit(1)
  }
  const user = users.find((u) => u.email === email)
  if (!user) {
    console.error(`No se encontró ningún usuario con el correo: ${email}`)
    process.exit(1)
  }

  // 2. Reset password + force change on next login
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    user_metadata: { ...user.user_metadata, must_change_password: true },
  })
  if (updateError) {
    console.error("Error al restablecer contraseña:", updateError.message)
    process.exit(1)
  }
  console.log(`✓ Contraseña restablecida para: ${email}`)

  // 3. Sign out all active sessions (Supabase may return a JWT error if the user
  //    has no active sessions — that's benign, so we only warn on other errors)
  const { error: signOutError } = await supabase.auth.admin.signOut(user.id, "global")
  if (signOutError) {
    const isNoSession =
      signOutError.message.toLowerCase().includes("jwt") ||
      signOutError.message.toLowerCase().includes("session")
    if (isNoSession) {
      console.log("✓ Sin sesiones activas que cerrar")
    } else {
      console.warn(`Advertencia al cerrar sesiones: ${signOutError.message}`)
    }
  } else {
    console.log("✓ Sesiones activas cerradas")
  }

  // 4. Optionally send email with new credentials
  if (sendEmail) {
    const transporter = createMailTransporter()
    await sendPasswordResetEmail(email, password, transporter)
    console.log("✓ Correo de restablecimiento enviado")
  }

  console.log("\n--- Credenciales ---")
  console.log(`Email:      ${email}`)
  console.log(`Contraseña: ${password}`)
  console.log("\nEl usuario deberá cambiar su contraseña al iniciar sesión.")
}

main()
