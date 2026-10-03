import { prisma } from "@/lib/prisma"
import { createCustomerProfile } from "@/lib/account-lifecycle"

export async function provisionSignup(authUserId: string) {
  const intent = await prisma.signupIntent.findUnique({ where: { authUserId } })
  if (!intent) return null
  if (intent.accountType === "CUSTOMER") {
    const profile = await createCustomerProfile(prisma, {
      authUserId,
      email: intent.email,
      name: intent.name?.trim() || intent.email.split("@")[0],
    })
    await prisma.signupIntent.update({ where: { id: intent.id }, data: { status: "completed" } })
    return { customerProfile: profile, user: null }
  }
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { authUserId } })
    const user = existing ?? await tx.user.create({ data: { authUserId, email: intent.email, name: intent.email.split("@")[0], role: "admin" } })
    await tx.onboardingProgress.upsert({
      where: { userId: user.id },
      create: { userId: user.id, businessId: user.businessId ?? undefined, status: "IN_PROGRESS" },
      update: { businessId: user.businessId ?? undefined },
    })
    await tx.signupIntent.update({ where: { id: intent.id }, data: { status: "completed" } })
    return { user, customerProfile: null }
  })
}
