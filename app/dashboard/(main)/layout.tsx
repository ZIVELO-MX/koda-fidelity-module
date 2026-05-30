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

  const business = await prisma.business.findUnique({
    where: { email: user.email },
    select: { name: true, brandColor: true },
  })

  if (!business) {
    redirect("/dashboard/forbidden")
  }

  const userEmail = user.email
  const businessName = business.name
  const brandColor = business.brandColor

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        userEmail={userEmail}
        businessName={businessName}
        brandColor={brandColor}
      />
      <div className="lg:pl-64">
        <DashboardHeader
          userEmail={userEmail}
          businessName={businessName}
          brandColor={brandColor}
        />
        <main className="p-4 sm:p-6 pt-4 lg:pt-6 pb-20 lg:pb-6">{children}</main>
      </div>
    </div>
  )
}
