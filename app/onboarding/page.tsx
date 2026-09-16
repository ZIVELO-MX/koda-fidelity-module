import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { Alta } from "@/components/onboarding/alta"

export const metadata: Metadata = {
  title: "Configura tu programa",
  robots: { index: false, follow: false },
}

/**
 * El alta guiada. Hoy, al registrarse, se cae directo a un panel vacío y sin
 * explicación: ni planes, ni cobro, ni una sola pregunta sobre el negocio.
 *
 * La sesión se comprueba aquí y no en el proxy: añadir la ruta a su matcher
 * haría que cada visita pidiera el usuario a Supabase, y esta pantalla ya es
 * de servidor.
 */
export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  const negocio = await prisma.business.findUnique({
    where: { email: user.email },
    select: { name: true, businessType: true, brandColor: true },
  })

  return (
    <Alta
      nombreInicial={negocio?.name ?? ""}
      categoriaInicial={negocio?.businessType ?? ""}
      colorInicial={negocio?.brandColor ?? "#ff6b35"}
    />
  )
}
