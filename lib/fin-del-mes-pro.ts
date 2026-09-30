/**
 * El aviso de fin del mes Pro incluido, del wireframe («Fin del primer mes»).
 *
 * Activar Lite regala un mes con todo Pro. Al terminar, `applyEntitlements` baja
 * la cuenta a Lite: los acabados Pro vuelven al color del negocio y **solo queda
 * activa una tarjeta**; las demás pasan a `LOCKED_BY_PLAN` y quien las escanee ve
 * que están temporalmente desactivadas. Sin aviso, eso le pasa al negocio de un
 * día para otro. El wireframe pide avisar con tres días de margen y enseñar el
 * cambio en vez de describirlo.
 *
 * La tarjeta que se conserva replica la regla de `applyEntitlements` sin tocar
 * ese archivo, que es ciclo de facturación: una prueba de paridad ejecuta la
 * función real sobre una base falsa y compara.
 */

/** Con cuánto margen llega el aviso, según el wireframe. */
export const DIAS_DE_MARGEN = 3
const DIA = 24 * 60 * 60 * 1000

export type TarjetaParaElAviso = {
  id: string
  name: string
  reward: string
  stampsRequired: number
  brandColor: string
  status: string
  isActive: boolean
  isLite: boolean
  createdAt: Date
  selectedTheme: { code: string; plan: "LITE" | "PRO" } | null
}

export type EntitlementsParaElAviso = {
  trial: boolean
  billingInterval: "MONTHLY" | "ANNUAL" | null
  subscription: { id: string; proTrialEndsAt: Date | null } | null
}

export type AvisoDeFinDeMes = {
  suscripcionId: string
  terminaEl: string
  diasRestantes: number
  intervalo: "MONTHLY" | "ANNUAL"
  /** La primera tarjeta con un acabado Pro, para enseñarla al lado de su versión Lite. */
  tarjetaConAcabado: Omit<TarjetaParaElAviso, "status" | "isActive" | "isLite" | "createdAt" | "selectedTheme"> & { themeCode: string } | null
  /** Solo cuando hay más de una activa: la que sigue, y las que se desactivan. */
  seQueda: string | null
  seDesactivan: string[]
}

/** La tarjeta que `applyEntitlements` deja activa al bajar a Lite. */
export function tarjetaQueSeConserva<T extends Pick<TarjetaParaElAviso, "status" | "isLite" | "createdAt">>(tarjetas: T[]): T | null {
  const vivas = [...tarjetas]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .filter((t) => t.status !== "ARCHIVED")
  return vivas.find((t) => t.isLite) ?? vivas[0] ?? null
}

export function avisoDeFinDeMes(
  entitlements: EntitlementsParaElAviso,
  tarjetas: TarjetaParaElAviso[],
  ahora = new Date(),
): AvisoDeFinDeMes | null {
  const termina = entitlements.subscription?.proTrialEndsAt
  if (!entitlements.trial || !entitlements.subscription || !termina) return null
  const faltan = termina.getTime() - ahora.getTime()
  if (faltan <= 0 || faltan > DIAS_DE_MARGEN * DIA) return null

  const conserva = tarjetaQueSeConserva(tarjetas)
  // Solo las que hoy están activas cambian: las ya bloqueadas siguen igual.
  const cambian = tarjetas.filter((t) => t.status !== "ARCHIVED" && t.isActive && t.id !== conserva?.id)
  const conAcabado = tarjetas.find((t) => t.status !== "ARCHIVED" && t.selectedTheme?.plan === "PRO")

  return {
    suscripcionId: entitlements.subscription.id,
    terminaEl: termina.toISOString(),
    diasRestantes: Math.ceil(faltan / DIA),
    intervalo: entitlements.billingInterval ?? "MONTHLY",
    tarjetaConAcabado: conAcabado
      ? {
          id: conAcabado.id,
          name: conAcabado.name,
          reward: conAcabado.reward,
          stampsRequired: conAcabado.stampsRequired,
          brandColor: conAcabado.brandColor,
          themeCode: conAcabado.selectedTheme!.code,
        }
      : null,
    seQueda: cambian.length ? conserva?.name ?? null : null,
    seDesactivan: cambian.map((t) => t.name),
  }
}
