import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { SettingsClient } from "./settings-client"

// El sufijo lo pone la plantilla de app/layout.tsx.
export const metadata = { title: "Configuración" }

/**
 * Configuración deja de ser una pantalla solo de administradores: cualquiera
 * entra a su propio perfil. El rol se lee aquí porque el cliente no tiene de
 * dónde saberlo, y decide qué bloques del negocio se pintan.
 */
export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  const userRecord = await prisma.user.findUnique({
    where: { authUserId: user.id },
    select: { role: true, businessId: true },
  })
  if (!userRecord || !userRecord.businessId) redirect("/dashboard/forbidden")

  return <SettingsClient role={userRecord.role} />
}
