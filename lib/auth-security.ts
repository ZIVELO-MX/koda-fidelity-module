import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { prisma } from "@/lib/prisma"

function secret() {
  const value = process.env.AUTH_SECURITY_SECRET
  if (!value || Buffer.byteLength(value) < 32) throw new Error("AUTH_SECURITY_SECRET must be at least 32 bytes")
  return value
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

function digest(domain: string, value: string) {
  return createHmac("sha256", secret()).update(`${domain}\0${value}`).digest("hex")
}

export function createInvitationToken() {
  const nonce = randomBytes(32).toString("base64url")
  const signature = digest("team-invitation", nonce)
  return { token: `${nonce}.${signature}`, tokenHash: digest("team-invitation-storage", nonce) }
}

export function invitationTokenHash(token: string) {
  const [nonce, signature] = token.split(".")
  if (!nonce || !signature || !/^[a-f0-9]{64}$/.test(signature)) return null
  const expected = Buffer.from(digest("team-invitation", nonce), "hex")
  const actual = Buffer.from(signature, "hex")
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  return digest("team-invitation-storage", nonce)
}

export async function enforceRateLimit(scope: string, subject: string, limit: number, windowMs: number) {
  const now = Date.now()
  const start = new Date(Math.floor(now / windowMs) * windowMs)
  const expiresAt = new Date(start.getTime() + windowMs)
  const subjectHash = digest(`rate-limit:${scope}`, subject)
  const row = await prisma.authRateLimit.upsert({
    where: { scope_subjectHash_windowStart: { scope, subjectHash, windowStart: start } },
    create: { scope, subjectHash, windowStart: start, expiresAt },
    update: { count: { increment: 1 } },
    select: { count: true },
  })
  if (row.count > limit) throw new Error("RATE_LIMITED")
}

export function requestIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown"
}
