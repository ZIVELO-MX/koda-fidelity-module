import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { EditCardForm } from "@/components/dashboard/edit-card-form"
import { toDateInputValue } from "@/lib/card-utils"
import { listActiveThemes } from "@/lib/card-themes"
import { getEntitlements } from "@/lib/account-lifecycle"

export default async function EditCardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) redirect("/login")

  const userRecord = await prisma.user.findUnique({
    where: { authUserId: user.id },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
  })

  if (!userRecord || !userRecord.business || userRecord.role !== "admin") {
    redirect("/dashboard/forbidden")
  }

  const card = await prisma.loyaltyCard.findUnique({
    where: { id },
    include: {
      milestoneRewards: {
        orderBy: { stampNumber: "asc" },
      },
    },
  })

  if (!card || card.businessId !== userRecord.business.id || !card.isActive) {
    redirect("/dashboard/cards")
  }

  // El catálogo y el plan se leen aquí, como la tarjeta: no hace falta una ruta
  // nueva. `getEntitlements` solo lee; el PUT ya sincroniza al guardar.
  const [temas, entitlements] = await Promise.all([
    listActiveThemes(prisma),
    getEntitlements(prisma, userRecord.business.id),
  ])

  return (
    <EditCardForm
      cardId={card.id}
      businessName={userRecord.business.name}
      businessLogo={userRecord.business.logoUrl}
      initialName={card.name}
      initialReward={card.reward}
      initialColor={card.brandColor}
      initialStampsRequired={card.stampsRequired}
      initialIcon={card.iconName}
      initialStampIcon={card.stampIconName}
      temas={temas.map((t) => ({ id: t.id, code: t.code, plan: t.plan === "PRO" ? "PRO" : "LITE" }))}
      plan={entitlements.plan === "PRO" ? "PRO" : "LITE"}
      initialThemeId={card.selectedThemeId}
      initialDescription={card.description}
      initialExpiresAt={card.expiresAt ? toDateInputValue(card.expiresAt) : null}
      initialMilestones={card.milestoneRewards.map((milestone) => ({
        id: milestone.id,
        stampNumber: milestone.stampNumber,
        label: milestone.label,
        iconName: milestone.iconName,
        probability: milestone.probability,
      }))}
    />
  )
}
