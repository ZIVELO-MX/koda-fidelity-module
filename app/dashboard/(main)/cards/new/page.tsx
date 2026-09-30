import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { listActiveThemes } from "@/lib/card-themes"
import { getEntitlements } from "@/lib/account-lifecycle"
import { NuevaTarjeta } from "./nueva-tarjeta"

/**
 * Nueva tarjeta. La página lee en el servidor el catálogo de temas y el plan del
 * negocio, como la edición, y el formulario sigue siendo de cliente. Antes la
 * página entera era de cliente y no tenía de dónde sacar el catálogo: solo el
 * alta lo recibía, por `/api/onboarding`.
 *
 * La sesión y el negocio los exige el layout del panel; aquí solo hace falta el
 * negocio para saber el plan, y sin él el selector trata la cuenta como Lite.
 */
export default async function CreateCardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const usuario = user
    ? await prisma.user.findUnique({ where: { authUserId: user.id }, select: { businessId: true } })
    : null

  const [temas, entitlements] = await Promise.all([
    listActiveThemes(prisma),
    usuario?.businessId ? getEntitlements(prisma, usuario.businessId) : null,
  ])

  return (
    <NuevaTarjeta
      temas={temas.map((t) => ({ id: t.id, code: t.code, plan: t.plan === "PRO" ? "PRO" : "LITE" }))}
      plan={entitlements?.plan === "PRO" ? "PRO" : "LITE"}
    />
  )
}
