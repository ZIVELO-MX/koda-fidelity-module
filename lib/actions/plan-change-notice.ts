"use server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { planChangeFromMetadata } from "@/lib/plan-change-notice"

export async function acknowledgePlanChangeNotice(eventId: string): Promise<boolean> {
  if (!eventId || eventId.length > 64) return false

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const member = await prisma.user.findUnique({
    where: { authUserId: user.id },
    select: { id: true, businessId: true, planChangeNoticeSeenAt: true },
  })
  if (!member?.businessId) return false

  const event = await prisma.billingAuditEvent.findFirst({
    where: {
      id: eventId,
      businessId: member.businessId,
      createdAt: { gt: member.planChangeNoticeSeenAt },
    },
    select: { createdAt: true, metadata: true },
  })
  if (!event || !planChangeFromMetadata(event.metadata)) return false

  await prisma.user.update({
    where: { id: member.id },
    data: { planChangeNoticeSeenAt: event.createdAt },
  })
  return true
}
