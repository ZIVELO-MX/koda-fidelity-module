import { redirect } from "next/navigation"
import type { Metadata } from "next"
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

  // El estado del alta lo sirve `GET /api/onboarding`, resuelto por
  // `authUserId`. Aquí solo se comprueba que haya sesión.
  return <Alta />
}
