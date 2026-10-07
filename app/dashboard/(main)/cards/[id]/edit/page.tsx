import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { EditCardForm } from "@/components/dashboard/edit-card-form"
import { toDateInputValue } from "@/lib/card-utils"
import { syncExpiredEntitlements } from "@/lib/account-lifecycle"

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

  const entitlements = await syncExpiredEntitlements(prisma, userRecord.business.id)
  const [card, savedPrimary] = await Promise.all([
    prisma.loyaltyCard.findUnique({
      where: { id },
      include: {
        selectedTheme: { select: { id: true, code: true, plan: true } },
        milestoneRewards: {
          orderBy: { stampNumber: "asc" },
        },
      },
    }),
    entitlements.subscription?.liteCardId
      ? prisma.loyaltyCard.findFirst({
          where: {
            id: entitlements.subscription.liteCardId,
            businessId: userRecord.business.id,
            status: { in: ["ACTIVE", "LOCKED_BY_PLAN"] },
          },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
  ])

  if (!card || card.businessId !== userRecord.business.id || !card.isActive) {
    redirect("/dashboard/cards")
  }

  const primaryCard = savedPrimary ?? (entitlements.plan === "LITE"
    ? await prisma.loyaltyCard.findFirst({
        where: { businessId: userRecord.business.id, status: "ACTIVE", isActive: true },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      })
    : null)

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
      initialThemeId={card.selectedThemeId}
      initialTextColor={card.textColor}
      initialDescription={card.description}
      initialExpiresAt={card.expiresAt ? toDateInputValue(card.expiresAt) : null}
      initialMilestones={card.milestoneRewards.map((milestone) => ({
        id: milestone.id,
        stampNumber: milestone.stampNumber,
        label: milestone.label,
        iconName: milestone.iconName,
        probability: milestone.probability,
      }))}
      initialIsPrimary={primaryCard?.id === card.id}
      initialPrimaryCardId={primaryCard?.id ?? null}
      initialPrimaryCardName={primaryCard?.id === card.id ? null : primaryCard?.name ?? null}
    />
  )
}
