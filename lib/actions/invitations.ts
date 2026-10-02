"use server"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { invitationTokenHash, normalizeEmail } from "@/lib/auth-security"

export async function acceptTeamInvitation(formData: FormData) {
  const token = String(formData.get("token") || "")
  const tokenHash = invitationTokenHash(token)
  if (!tokenHash) redirect("/auth/error?error=Invitacion%20invalida")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect(`/login?next=${encodeURIComponent(`/invite?token=${token}`)}`)
  try {
    await prisma.$transaction(async (tx) => {
      const invitation = await tx.teamInvitation.findUnique({ where: { tokenHash } })
      if (!invitation || invitation.status !== "pending" || invitation.expiresAt <= new Date()) throw new Error("INVITATION_INVALID")
      if (normalizeEmail(user.email!) !== invitation.email) throw new Error("INVITATION_EMAIL_MISMATCH")
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${invitation.businessId}))`
      const memberLimit = Number.parseInt(process.env.TEAM_MEMBER_LIMIT ?? "3", 10)
      if (await tx.user.count({ where: { businessId: invitation.businessId } }) >= memberLimit) throw new Error("TEAM_LIMIT")
      await tx.user.create({ data: { authUserId: user.id, email: invitation.email, name: invitation.name, role: invitation.role, businessId: invitation.businessId, passwordSetupRequired: true } })
      await tx.teamInvitation.update({ where: { id: invitation.id }, data: { status: "accepted", acceptedAt: new Date() } })
    })
  } catch (error) {
    // Sin esto el invitado veía la pantalla de error genérica sin saber qué hacer.
    const aviso = motivoDeRechazo(error)
    if (!aviso) throw error
    redirect(`/invite?token=${encodeURIComponent(token)}&aviso=${aviso}`)
  }
  redirect("/dashboard/update-password")
}

function motivoDeRechazo(error: unknown) {
  // Un P2002 es que esa cuenta o ese correo ya pertenecen a otro negocio.
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "otro-negocio"
  const motivos: Record<string, string> = { INVITATION_INVALID: "no-disponible", INVITATION_EMAIL_MISMATCH: "otro-correo", TEAM_LIMIT: "equipo-completo" }
  return error instanceof Error ? motivos[error.message] : undefined
}
