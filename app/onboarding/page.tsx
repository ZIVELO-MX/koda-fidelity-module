import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase-server"
import { Alta } from "@/components/onboarding/alta"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = {
  title: "Configura tu programa",
  robots: { index: false, follow: false },
}

/**
 * El alta guiada. Hoy, al registrarse, se cae directo a un panel vacío y sin
 * explicación: ni planes, ni cobro, ni una sola pregunta sobre el negocio.
 *
 * La sesión se comprueba aquí y no en el proxy: añadir la ruta a su matcher
 * haría que cada visita pidiera el usuario a Supabase, y esta pantalla ya es
 * de servidor.
 */
export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  const userRecord = await prisma.user.findUnique({
    where: { authUserId: user.id },
    select: { role: true, businessId: true, business: { select: { id: true, name: true } } },
  })

  if (userRecord?.businessId && userRecord.business) {
    const [activeSubscription, latestPlanEvent] = await Promise.all([
      prisma.subscription.findFirst({
        where: { businessId: userRecord.businessId, status: "ACTIVE" },
        select: { id: true },
      }),
      prisma.billingAuditEvent.findFirst({
        where: { businessId: userRecord.businessId, action: { in: ["activate", "set_plan", "deactivate_plan"] } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { action: true },
      }),
    ])
    const manuallyDeactivated = !activeSubscription && latestPlanEvent?.action === "deactivate_plan"

    if (manuallyDeactivated && userRecord.role === "sellador") {
      return (
        <main className="landing flex min-h-screen items-center justify-center bg-background p-6 forced-light">
          <section role="status" className="w-full max-w-xl space-y-3 rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Cuenta inactiva</h1>
            <p className="text-muted-foreground">
              La cuenta de {userRecord.business.name} está inactiva. Pide a un administrador que la reactive.
            </p>
          </section>
        </main>
      )
    }

    return <Alta allowPlanSelectionWhileAwaitingActivation={manuallyDeactivated && userRecord.role === "admin"} />
  }

  // El estado del alta lo sirve `GET /api/onboarding`, resuelto por `authUserId`.
  return <Alta />
}
