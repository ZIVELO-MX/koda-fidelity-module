import "dotenv/config"
import { Resend } from "resend"
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
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("Falta RESEND_API_KEY en las variables de entorno")
    process.exit(1)
  }

  const { email, name, password, to } = parseArgs()
  const recipient = to ?? email
  const resend = new Resend(apiKey)

  console.log(`Enviando invitación a ${recipient}...`)

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? "Koda Fidelity <noreply@zivelo.dev>",
    to: recipient,
    subject: "¡Tu cuenta en Koda Fidelity está lista!",
    html: buildHtml(name, email, password),
  })

  if (error) {
    console.error("Error al enviar:", error.message)
    process.exit(1)
  }

  console.log(`Correo enviado. ID: ${data?.id}`)
  console.log(`Destinatario: ${recipient}`)
  console.log(`Cuenta:       ${email}`)
  console.log(`Negocio:      ${name}`)
}

main()
