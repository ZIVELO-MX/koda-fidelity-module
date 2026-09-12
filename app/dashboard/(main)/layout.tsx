import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client"
import { derivarMarca } from "@/lib/color-marca"
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

  // El color del negocio no se inyecta crudo: de él se derivan los estados y el
  // color de texto que sí se lee encima.
  const marca = derivarMarca(business.brandColor)

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        '--primary': marca.base,
        '--primary-foreground': marca.texto,
        '--ring': marca.base,
        '--sidebar-primary': marca.base,
        '--sidebar-primary-foreground': marca.texto,
        '--sidebar-ring': marca.base,
        '--chart-1': marca.base,
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
