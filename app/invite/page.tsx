import { prisma } from "@/lib/prisma"
import { invitationTokenHash } from "@/lib/auth-security"
import { acceptTeamInvitation } from "@/lib/actions/invitations"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Invitación — Koda Fidelity" }

// Por qué no se pudo aceptar, cuando la invitación sigue vigente.
const AVISOS: Record<string, string> = {
  "otro-correo": "Esta invitación es para otro correo. Entra con la cuenta del correo al que te llegó.",
  "equipo-completo": "El equipo ya está completo. Pide a quien te invitó que libere un lugar.",
  "otro-negocio": "Tu cuenta ya pertenece a otro negocio, y por ahora una cuenta solo puede estar en uno.",
}

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string; aviso?: string }> }) {
  const { token = "", aviso } = await searchParams
  const motivo = aviso ? AVISOS[aviso] : undefined
  const tokenHash = invitationTokenHash(token)
  const invitation = tokenHash ? await prisma.teamInvitation.findUnique({ where: { tokenHash }, select: { name: true, status: true, expiresAt: true, business: { select: { name: true } } } }) : null
  const valid = invitation?.status === "pending" && invitation.expiresAt > new Date()
  return <main className="min-h-screen flex items-center justify-center p-6 bg-background forced-light"><div className="w-full max-w-sm text-center space-y-6">
    <div className="text-4xl" aria-hidden="true">👋</div>
    {valid ? <><div className="space-y-2"><p className="text-muted-foreground">Hola {invitation.name},</p><h1 className="text-2xl font-bold">Te invitaron a {invitation.business.name}</h1><p className="text-sm text-muted-foreground">Acepta la invitación y después crea tu contraseña personal.</p></div>{motivo && <p role="alert" className="text-sm text-destructive">{motivo}</p>}<form action={acceptTeamInvitation}><input type="hidden" name="token" value={token} /><Button type="submit" className="w-full">Aceptar invitación</Button></form></> : <>
      <h1 className="text-2xl font-bold">Invitación no disponible</h1>
      <p className="text-sm text-muted-foreground">El enlace es inválido, expiró o ya fue utilizado.</p>
      {/* Sin salida, esta pantalla era un callejón: quien llega aquí con un
          enlace viejo se quedaba mirando el aviso. Si ya tiene cuenta entra, y
          si no, pide otra invitación a quien se la mandó. */}
      <p className="text-sm text-muted-foreground">Pide a quien te invitó que te mande uno nuevo.</p>
      <Button asChild variant="outline" className="min-h-11 w-full">
        <Link href="/login">Iniciar sesión</Link>
      </Button>
    </>}
  </div></main>
}
