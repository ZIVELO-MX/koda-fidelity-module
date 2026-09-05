import { prisma } from "@/lib/prisma"
import { invitationTokenHash } from "@/lib/auth-security"
import { acceptTeamInvitation } from "@/lib/actions/invitations"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Invitación — Koda Fidelity" }

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? ""
  const tokenHash = invitationTokenHash(token)
  const invitation = tokenHash ? await prisma.teamInvitation.findUnique({ where: { tokenHash }, select: { name: true, status: true, expiresAt: true, business: { select: { name: true } } } }) : null
  const valid = invitation?.status === "pending" && invitation.expiresAt > new Date()
  return <main className="min-h-screen flex items-center justify-center p-6 bg-background forced-light"><div className="w-full max-w-sm text-center space-y-6">
    <div className="text-4xl" aria-hidden="true">👋</div>
    {valid ? <><div className="space-y-2"><p className="text-muted-foreground">Hola {invitation.name},</p><h1 className="text-2xl font-bold">Te invitaron a {invitation.business.name}</h1><p className="text-sm text-muted-foreground">Acepta la invitación y después crea tu contraseña personal.</p></div><form action={acceptTeamInvitation}><input type="hidden" name="token" value={token} /><Button type="submit" className="w-full">Aceptar invitación</Button></form></> : <><h1 className="text-2xl font-bold">Invitación no disponible</h1><p className="text-sm text-muted-foreground">El enlace es inválido, expiró o ya fue utilizado.</p></>}
  </div></main>
}
