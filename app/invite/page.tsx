import Link from "next/link"
import type { Metadata } from "next"
import { siteConfig } from "@/lib/site-config"

type Props = {
  searchParams: Promise<{ email?: string; business?: string; name?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const businessName = params.business ?? siteConfig.name
  const name = params.name ? `, ${params.name}` : ""

  return {
    title: `Te invitaron a ${businessName} — ${siteConfig.name}`,
    description: `Hola${name}. Tienes una invitación para unirte al equipo de ${businessName} en Koda Fidelity.`,
    openGraph: {
      title: `Invitación de ${businessName}`,
      description: `Únete al equipo de ${businessName} en Koda Fidelity`,
    },
  }
}

export default async function InvitePage({ searchParams }: Props) {
  const params = await searchParams
  const email = params.email ?? ""
  const businessName = params.business ?? siteConfig.name
  const name = params.name ?? null

  const loginHref = email
    ? `/login?email=${encodeURIComponent(email)}`
    : "/login"

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm text-center space-y-8">
        {/* Icon */}
        <div className="mx-auto h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl">
          👋
        </div>

        {/* Copy */}
        <div className="space-y-2">
          {name && (
            <p className="text-muted-foreground text-base">Hola {name},</p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Te invitaron a unirte a
          </h1>
          <p className="text-2xl font-bold text-primary">{businessName}</p>
          <p className="text-sm text-muted-foreground pt-1">
            Accede con el correo y la contraseña temporal que te compartió el administrador.
          </p>
        </div>

        {/* CTA */}
        <Link
          href={loginHref}
          className="block w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors text-center"
        >
          Acceder a mi cuenta →
        </Link>

        <p className="text-xs text-muted-foreground">
          Powered by{" "}
          <span className="font-semibold text-foreground">{siteConfig.name}</span>
        </p>
      </div>
    </main>
  )
}
