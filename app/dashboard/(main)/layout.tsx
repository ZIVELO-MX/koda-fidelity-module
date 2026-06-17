import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
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
    include: { business: { select: { name: true, brandColor: true, nickname: true, logoUrl: true } } },
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
      <DashboardSidebar
        userEmail={user.email}
        businessName={business.name}
        brandColor={business.brandColor}
        logoUrl={business.logoUrl ?? undefined}
        nickname={business.nickname ?? undefined}
        role={role}
      />
      <div className="lg:pl-64">
        <DashboardHeader
          userEmail={user.email}
          businessName={business.name}
          brandColor={business.brandColor}
          logoUrl={business.logoUrl ?? undefined}
          nickname={business.nickname ?? undefined}
          role={role}
        />
        <main className="p-4 sm:p-6 pt-4 lg:pt-6 pb-20 lg:pb-6">{children}</main>
      </div>
    </div>
  )
}
