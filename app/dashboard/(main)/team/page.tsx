import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { redirect } from "next/navigation"
import { TeamClient } from "./team-client"

export const metadata = { title: "Equipo — Koda Fidelity" }

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  const userRecord = await prisma.user.findUnique({
    where: { authUserId: user.id },
    select: { id: true, name: true, role: true, businessId: true, business: { select: { name: true } } },
  })

  if (!userRecord || userRecord.role !== "admin") redirect("/dashboard")

  const dbUsers = await prisma.user.findMany({
    where: { businessId: userRecord.businessId },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })

  // Fetch last_sign_in_at from Supabase Auth to show invite vs accessed status
  const admin = createAdminClient()
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 100 })
  const signInByEmail = new Map(
    authUsers.map((u) => [u.email ?? "", u.last_sign_in_at ?? null]),
  )

  const users = dbUsers.map((u) => ({
    ...u,
    hasLoggedIn: signInByEmail.has(u.email) && signInByEmail.get(u.email) !== null,
  }))

  const memberLimit = parseInt(process.env.TEAM_MEMBER_LIMIT ?? "3", 10)

  return (
    <TeamClient
      currentUserId={userRecord.id}
      currentUserName={userRecord.name}
      businessName={userRecord.business.name}
      initialUsers={users}
      memberLimit={memberLimit}
    />
  )
}
