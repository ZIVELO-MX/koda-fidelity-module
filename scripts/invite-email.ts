import nodemailer from "nodemailer"
import { readFileSync } from "fs"
import { resolve } from "path"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://fidelity.zivelo.dev"

export type InviteEmailInput = {
  email: string
  name: string
  password: string
  to?: string
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

export async function sendInviteEmail(input: InviteEmailInput): Promise<string> {
  const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]
  const missing = required.filter((key) => !process.env[key])
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`)
  }

  const recipient = input.to ?? input.email
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_PORT !== "587",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const info = await transporter.sendMail({
    from: `Koda Fidelity <${process.env.SMTP_USER}>`,
    to: recipient,
    cc: ["benjamin.rodriguez@zivelo.dev", "raul.mendez@zivelo.dev"],
    subject: "¡Tu cuenta en Koda Fidelity está lista!",
    html: buildHtml(input.name, input.email, input.password),
  })

  return info.messageId
}
