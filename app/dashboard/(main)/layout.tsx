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

  const business = await prisma.business.findUnique({
    where: { email: user.email },
    select: { name: true, brandColor: true, nickname: true },
  })

  if (!business) {
    redirect("/dashboard/forbidden")
  }

  const userEmail = user.email
  const businessName = business.name
  const brandColor = business.brandColor
  const nickname = business.nickname ?? undefined

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        userEmail={userEmail}
        businessName={businessName}
        brandColor={brandColor}
        nickname={nickname}
      />
      <div className="lg:pl-64">
        <DashboardHeader
          userEmail={userEmail}
          businessName={businessName}
          brandColor={brandColor}
          nickname={nickname}
        />
        <main className="p-4 sm:p-6 pt-4 lg:pt-6 pb-20 lg:pb-6">{children}</main>
      </div>
    </div>
  )
}
