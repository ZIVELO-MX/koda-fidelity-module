import nodemailer from "nodemailer"

const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!)

export async function sendSecureInviteEmail(input: { email: string; name: string; businessName: string; url: string }) {
  const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]
  const missing = required.filter((key) => !process.env[key])
  if (missing.length) throw new Error(`Missing email configuration: ${missing.join(", ")}`)
  const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 465), secure: process.env.SMTP_PORT !== "587", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
  const name = escapeHtml(input.name)
  const businessName = escapeHtml(input.businessName)
  const url = escapeHtml(input.url)
  await transporter.sendMail({ from: `Koda Fidelity <${process.env.SMTP_USER}>`, to: input.email, subject: `Invitación al equipo de ${input.businessName}`, html: `<p>Hola ${name},</p><p>Te invitaron al equipo de <strong>${businessName}</strong>.</p><p><a href="${url}">Aceptar invitación</a></p><p>El enlace expira en 24 horas.</p>` })
}
