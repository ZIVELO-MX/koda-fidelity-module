import "dotenv/config"
import { sendInviteEmail } from "./invite-email"

const DEFAULT_PASSWORD = "Koda1234!"

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

async function main() {
  const { email, name, password, to } = parseArgs()
  const recipient = to ?? email

  console.log(`Enviando invitación a ${recipient}...`)

  const messageId = await sendInviteEmail({ email, name, password, to })

  console.log(`Correo enviado. ID: ${messageId}`)
  console.log(`Destinatario: ${recipient}`)
  console.log(`Cuenta:       ${email}`)
  console.log(`Negocio:      ${name}`)
}

main()
