import "dotenv/config"
import { prisma } from "../lib/prisma"
import { createAdminClient } from "../lib/supabase-admin"

async function main() {
 const apply = process.argv.includes("--apply")
 const admin = createAdminClient()
 const authByEmail = new Map<string, string[]>()
 for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
  if (error) throw error
  for (const user of data.users) {
    if (!user.email) continue
    const email = user.email.trim().toLowerCase()
    authByEmail.set(email, [...(authByEmail.get(email) ?? []), user.id])
  }
  if (data.users.length < 100) break
 }

 const users = await prisma.user.findMany({ where: { authUserId: null }, select: { id: true, email: true } })
 let matched = 0, unmatched = 0, ambiguous = 0
 for (const user of users) {
  const ids = authByEmail.get(user.email.trim().toLowerCase()) ?? []
  if (ids.length === 1) {
    matched++
    if (apply) await prisma.user.update({ where: { id: user.id }, data: { authUserId: ids[0] } })
  } else if (ids.length === 0) unmatched++
  else ambiguous++
 }
 console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", matched, unmatched, ambiguous }))
 if (ambiguous > 0) process.exitCode = 1
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
