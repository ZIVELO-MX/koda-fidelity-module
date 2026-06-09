import "dotenv/config"
import nodemailer from "nodemailer"
import { readFileSync } from "fs"
import { resolve } from "path"

const DEFAULT_PASSWORD = "Koda1234!"
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://fidelity.zivelo.dev"

function parseArgs(): { email: string; name: string; password: string; to?: string } {
  const args = process.argv.slice(2)
  const result: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      result[args[i].slice(2)] = args[i + 1] ?? ""
      i++
    }
  }
  if (!result.email || !result.name) {
    console.error("Uso: pnpm send:invite --email <email> --name <nombre> [--password <password>] [--to <override>]")
    console.error("Ejemplo: pnpm send:invite --email cafe@ejemplo.com --name \"Café El Sol\"")
    process.exit(1)
  }
  return {
    email: result.email,
    name: result.name,
    password: result.password || DEFAULT_PASSWORD,
    to: result.to,
  }
}

function buildHtml(name: string, email: string, password: string): string {
  const loginUrl = `${BASE_URL}/login?email=${encodeURIComponent(email)}`
  const template = readFileSync(resolve("docs/email-templates/invite.html"), "utf-8")
  return template
    .replace(/{{NAME}}/g, name)
    .replace(/{{EMAIL}}/g, email)
    .replace(/{{PASSWORD}}/g, password)
    .replace(/{{LOGIN_URL}}/g, loginUrl)
}

async function main() {
  const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]
  const missing = required.filter((k) => !process.env[k])
  if (missing.length) {
    console.error(`Faltan variables de entorno: ${missing.join(", ")}`)
    process.exit(1)
  }

  const { email, name, password, to } = parseArgs()
  const recipient = to ?? email

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_PORT !== "587",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  console.log(`Enviando invitación a ${recipient}...`)

  const info = await transporter.sendMail({
    from: `Koda Fidelity <${process.env.SMTP_USER}>`,
    to: recipient,
    cc: ["benjamin.rodriguez@zivelo.dev", "raul.mendez@zivelo.dev"],
    subject: "¡Tu cuenta en Koda Fidelity está lista!",
    html: buildHtml(name, email, password),
  })

  console.log(`Correo enviado. ID: ${info.messageId}`)
  console.log(`Destinatario: ${recipient}`)
  console.log(`Cuenta:       ${email}`)
  console.log(`Negocio:      ${name}`)
}

main()
