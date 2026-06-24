import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  if (user.user_metadata?.must_change_password) {
    redirect("/dashboard/update-password")
  }

  const userRecord = await prisma.user.findUnique({
    where: { email: user.email },
    include: { business: { select: { name: true, brandColor: true, nickname: true } } },
  })

  if (!userRecord) {
    redirect("/dashboard/forbidden")
  }

  const { business, role } = { business: userRecord.business, role: userRecord.role }

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        '--primary': business.brandColor,
        '--ring': business.brandColor,
        '--sidebar-primary': business.brandColor,
        '--sidebar-ring': business.brandColor,
        '--chart-1': business.brandColor,
      } as React.CSSProperties}
    >
      <DashboardLayoutClient
        userEmail={user.email}
        businessName={business.name}
        brandColor={business.brandColor}
        nickname={business.nickname ?? undefined}
        role={role}
      >
        {children}
      </DashboardLayoutClient>
    </div>
  )
}
