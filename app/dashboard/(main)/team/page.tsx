import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { TeamClient } from "./team-client"

export const metadata = { title: "Equipo — Koda Fidelity" }

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  const userRecord = await prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true, name: true, role: true, businessId: true, business: { select: { name: true } } },
  })

  if (!userRecord || userRecord.role !== "admin") redirect("/dashboard")

  const users = await prisma.user.findMany({
    where: { businessId: userRecord.businessId },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })

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
