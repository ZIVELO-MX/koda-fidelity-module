import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { redirect } from "next/navigation"
import { TeamClient } from "./team-client"

// El sufijo lo pone la plantilla de app/layout.tsx.
export const metadata = { title: "Equipo" }

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  const userRecord = await prisma.user.findUnique({
    where: { authUserId: user.id },
    select: { id: true, name: true, role: true, businessId: true, business: { select: { name: true } } },
  })

  if (!userRecord || !userRecord.businessId || !userRecord.business || userRecord.role !== "admin") redirect("/dashboard")

  const dbUsers = await prisma.user.findMany({
    where: { businessId: userRecord.businessId },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, authUserId: true, name: true, role: true, createdAt: true },
  })

  // El último acceso dice si el miembro ya entró o sigue invitado. Se pide por
  // miembro: `listUsers` traía solo la primera página de Auth, que incluye a los
  // clientes de toda la plataforma, y con más de 100 cuentas fallaba.
  const admin = createAdminClient()
  const users = await Promise.all(dbUsers.map(async ({ authUserId, ...u }) => {
    const authUser = authUserId ? (await admin.auth.admin.getUserById(authUserId)).data.user : null
    return { ...u, hasLoggedIn: Boolean(authUser?.last_sign_in_at) }
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
