import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client"
import { FinDelMesPro } from "@/components/dashboard/fin-del-mes-pro"
import { getEntitlements } from "@/lib/account-lifecycle"
import { avisoDeFinDeMes } from "@/lib/fin-del-mes-pro"
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

  const userRecord = await prisma.user.findUnique({
    where: { authUserId: user.id },
    include: { business: { select: { id: true, name: true, brandColor: true, nickname: true } } },
  })

  if (!userRecord || !userRecord.business) {
    redirect("/dashboard/forbidden")
  }
  if (userRecord.passwordSetupRequired) redirect("/dashboard/update-password")

  const [closure] = await Promise.all([
    prisma.accountClosure.findFirst({ where: { businessId: userRecord.business.id, status: { in: ["SCHEDULED", "PROCESSING", "FAILED"] } }, orderBy: { scheduledFor: "asc" }, select: { scheduledFor: true } }),
  ])
  const { business, role } = { business: userRecord.business, role: userRecord.role }

  // El fin del mes Pro solo lo ve quien puede decidir sobre el plan. Las
  // tarjetas solo se leen si hay prueba en curso: el resto de las veces el
  // aviso cuesta una consulta, la de la suscripción.
  const aviso = role === "admin" ? await calcularAviso(business.id) : null

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
        closureScheduledFor={closure?.scheduledFor.toISOString()}
        avisos={aviso && <FinDelMesPro aviso={aviso} negocio={business.name} correo={user.email} />}
      >
        {children}
      </DashboardLayoutClient>
    </div>
  )
}

async function calcularAviso(businessId: string) {
  const entitlements = await getEntitlements(prisma, businessId)
  if (!entitlements.trial || !entitlements.subscription) return null
  const tarjetas = await prisma.loyaltyCard.findMany({
    where: { businessId },
    select: {
      id: true, name: true, reward: true, stampsRequired: true, brandColor: true,
      status: true, isActive: true, isLite: true, createdAt: true,
      selectedTheme: { select: { code: true, plan: true } },
    },
  })
  return avisoDeFinDeMes(
    {
      trial: entitlements.trial,
      billingInterval: entitlements.billingInterval,
      subscription: { id: entitlements.subscription.id, proTrialEndsAt: entitlements.subscription.proTrialEndsAt },
    },
    tarjetas,
  )
}
