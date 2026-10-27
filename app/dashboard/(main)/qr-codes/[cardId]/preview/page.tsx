import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { JoinCardLayout, type JoinCardData } from "@/components/join/join-card-layout"

export default async function QRJoinPreviewPage({
  params,
}: {
  params: Promise<{ cardId: string }>
}) {
  const { cardId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  const business = await prisma.business.findFirst({
    where: { users: { some: { authUserId: user.id } } },
    select: { id: true },
  })
  if (!business) redirect("/login")

  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    include: {
      business: {
        select: { name: true, brandColor: true, logoUrl: true, iconName: true },
      },
      effectiveTheme: { select: { code: true } },
    },
  })

  if (!card || card.businessId !== business.id) {
    redirect("/dashboard/qr-codes")
  }

  const cardInfo: JoinCardData = {
    name: card.name,
    stampsRequired: card.stampsRequired,
    reward: card.reward,
    brandColor: card.brandColor,
    textColor: card.textColor,
    iconName: card.iconName,
    stampIconName: card.stampIconName,
    themeCode: card.effectiveTheme?.code,
    expiresAt: card.expiresAt?.toISOString() ?? null,
    businessName: card.business.name,
    businessBrandColor: card.business.brandColor,
    businessLogoUrl: card.business.logoUrl,
    businessIconName: card.business.iconName,
  }

  return (
    <JoinCardLayout
      cardInfo={cardInfo}
      preview
      previewBackHref={`/dashboard/qr-codes/${cardId}`}
    />
  )
}
