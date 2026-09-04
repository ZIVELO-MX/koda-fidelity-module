import { prisma } from "@/lib/prisma"

export async function provisionSignup(authUserId: string) {
  const intent = await prisma.signupIntent.findUnique({ where: { authUserId } })
  if (!intent) return null
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { authUserId } })
    if (existing) return existing
    const business = await tx.business.create({ data: { email: intent.email, name: intent.name } })
    const user = await tx.user.create({ data: { authUserId, email: intent.email, name: intent.name, role: "admin", businessId: business.id } })
    await tx.signupIntent.update({ where: { id: intent.id }, data: { status: "completed" } })
    return user
  })
}
