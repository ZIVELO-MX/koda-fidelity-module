import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { CardQRClient } from "./card-qr-client"

export default async function CardQRPage({
  params,
}: {
  params: Promise<{ cardId: string }>
}) {
  const { cardId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  const business = await prisma.business.findUnique({
    where: { email: user.email },
    select: { id: true },
  })
  if (!business) redirect("/login")

  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      businessId: true,
      isActive: true,
      name: true,
      reward: true,
      stampsRequired: true,
      brandColor: true,
      iconName: true,
    },
  })

  // Redirect if card doesn't exist, is archived, or belongs to another business
  if (!card || !card.isActive || card.businessId !== business.id) {
    redirect("/dashboard/qr-codes")
  }

  return <CardQRClient card={card} />
}
