import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { siteConfig } from "@/lib/site-config"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cardId: string }>
}): Promise<Metadata> {
  const { cardId } = await params

  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    include: { business: true },
  })

  if (!card) {
    return {
      title: "Tarjeta no encontrada",
    }
  }

  const ogImageUrl = `/join/${cardId}/opengraph-image`
  const title = `Únete a ${card.business.name} - ${siteConfig.name}`
  const description = `Obtén tu tarjeta de lealtad de ${card.business.name}. ${card.stampsRequired} sellos → ${card.reward}.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/join/${cardId}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  }
}

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
