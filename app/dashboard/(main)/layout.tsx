import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client"
import { derivarMarca } from "@/lib/color-marca"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { resolveEffectiveEntitlements, syncExpiredEntitlements } from "@/lib/account-lifecycle"
import { latestPlanChangeNotice } from "@/lib/plan-change-notice"
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
    include: {
      business: {
        select: {
          id: true, name: true, brandColor: true, nickname: true,
          onboardingProgresses: { where: { status: { not: "ACTIVE" } }, select: { id: true }, take: 1 },
          subscriptions: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 },
        },
      },
      onboardingProgress: { select: { status: true } },
    },
  })

  if (!userRecord || !userRecord.business) {
    redirect("/dashboard/forbidden")
  }
  if (userRecord.passwordSetupRequired) redirect("/dashboard/update-password")
  const businessAwaitingActivation = userRecord.business.subscriptions.length === 0
    && ((userRecord.onboardingProgress && userRecord.onboardingProgress.status !== "ACTIVE") || userRecord.business.onboardingProgresses.length > 0)
  if (businessAwaitingActivation) redirect("/onboarding")

  await syncExpiredEntitlements(prisma, userRecord.business.id)
  const [closure, activeSubscription] = await Promise.all([
    prisma.accountClosure.findFirst({ where: { businessId: userRecord.business.id, status: { in: ["SCHEDULED", "PROCESSING", "FAILED"] } }, orderBy: { scheduledFor: "asc" }, select: { scheduledFor: true } }),
    prisma.subscription.findFirst({ where: { businessId: userRecord.business.id, status: "ACTIVE" }, orderBy: { createdAt: "desc" } }),
  ])
  const accountPlan = activeSubscription ? resolveEffectiveEntitlements(activeSubscription).plan : null
  const planChangeEvents = accountPlan ? await prisma.billingAuditEvent.findMany({
    where: { businessId: userRecord.business.id, createdAt: { gt: userRecord.planChangeNoticeSeenAt } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
    select: { id: true, metadata: true },
  }) : []
  const planChangeNotice = latestPlanChangeNotice(planChangeEvents, accountPlan)
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
        accountPlan={accountPlan}
        planChangeNotice={planChangeNotice}
        closureScheduledFor={closure?.scheduledFor.toISOString()}
      >
        {children}
      </DashboardLayoutClient>
    </div>
  )
}
