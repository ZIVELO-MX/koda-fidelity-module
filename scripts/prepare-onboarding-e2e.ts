import "dotenv/config"
import { Prisma, PrismaClient } from "@prisma/client"
import { activateManualSubscription } from "../lib/account-lifecycle"

/**
 * Fixture del alta guiada y de los planes, para que los recorridos de
 * Playwright arranquen siempre del mismo sitio.
 *
 * Reutiliza la cuenta que ya crea `prepare-auth-e2e.ts` en vez de inventar
 * otra, y deja su alta en el primer paso con los borradores vacíos.
 *
 * El reset se hace por Prisma y no con `pnpm onboarding:debug -- reset` a
 * propósito: ese script exige que el correo termine en `@invalid.dev` y todas
 * las cuentas del arnés son `@dev.invalid`, así que hoy no puede apuntar a
 * ninguna. Está documentado en FID-0026; cuando se unifique el dominio, esto
 * puede llamar al script.
 */
const prisma = new PrismaClient()

const email = process.env.E2E_ONBOARDING_EMAIL ?? "fidelity.seed.portal@dev.invalid"
const plan = (process.env.E2E_ONBOARDING_PLAN ?? "LITE") as "LITE" | "PRO"
/**
 * `expired-trial` deja el negocio con un mes de Pro ya vencido y dos tarjetas,
 * una de ellas con un tema Pro elegido. Es el estado desde el que se comprueba
 * la transición a Lite: qué se conserva, qué se bloquea y a qué cae el tema.
 */
const modo = process.env.E2E_ONBOARDING_MODE ?? "fresh"

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { onboardingProgress: true },
  })
  if (!user) throw new Error(`Fixture user not found: ${email}. Run prepare-auth-e2e first.`)
  if (!user.businessId) throw new Error(`Fixture user has no business: ${email}`)

  const reset = {
    step: "INTRO" as const,
    status: "IN_PROGRESS" as const,
    draftVersion: { increment: 1 },
    businessDraft: Prisma.JsonNull,
    cardDraft: Prisma.JsonNull,
    acquisitionSource: null,
    selectedBillingInterval: null,
    introSkippedAt: null,
    acquisitionSkippedAt: null,
  }

  const progress = user.onboardingProgress
    ? await prisma.onboardingProgress.update({ where: { id: user.onboardingProgress.id }, data: reset })
    : await prisma.onboardingProgress.create({ data: { userId: user.id, businessId: user.businessId } })

  // El plan se fija de forma idempotente: la clave lleva el plan, así que
  // repetir la preparación no encadena suscripciones.
  await activateManualSubscription(prisma, {
    businessId: user.businessId,
    plan,
    proAccessGranted: plan === "PRO",
    operator: "e2e-fixture",
    action: "set_plan",
    idempotencyKey: `e2e-onboarding:${user.businessId}:${plan}`,
  })

  // `activateManualSubscription` marca el alta como ACTIVE al activar, así que
  // el reset se vuelve a aplicar después para dejarla realmente al principio.
  await prisma.onboardingProgress.update({ where: { id: progress.id }, data: reset })

  const trial = modo === "expired-trial" ? await prepararTrialVencido(user.businessId) : null
  // `activateManualSubscription` marca el alta como ACTIVE, así que se vuelve a
  // dejar al principio después de montar el trial.
  if (trial) await prisma.onboardingProgress.update({ where: { id: progress.id }, data: reset })

  console.log(JSON.stringify({ email, businessId: user.businessId, plan, modo, onboarding: "reset", ...trial }))
}

/**
 * El trial se crea ya vencido: `activateManualSubscription` exige que
 * `proTrialEndsAt` sea posterior a `periodStart`, no que sea futuro, así que el
 * periodo arranca en el pasado y el trial termina antes de hoy.
 */
async function prepararTrialVencido(businessId: string) {
  const ahora = Date.now()
  const inicio = new Date(ahora - 60 * 24 * 60 * 60 * 1000)
  const finDelTrial = new Date(ahora - 30 * 24 * 60 * 60 * 1000)

  // Sin temas Pro en el catálogo no se puede montar este estado. No se tumba la
  // preparación: se informa, y el spec decide si puede correr.
  const temaPro = await prisma.loyaltyTheme.findFirst({
    where: { isActive: true, plan: "PRO" },
    orderBy: { code: "asc" },
  })

  // Dos tarjetas: con Lite solo una puede quedar activa.
  const existentes = await prisma.loyaltyCard.count({ where: { businessId } })
  for (let i = existentes; i < 2; i += 1) {
    await prisma.loyaltyCard.create({
      data: { businessId, name: `Tarjeta E2E ${i + 1}`, reward: "Premio E2E", stampsRequired: 10, isActive: true, status: "ACTIVE" },
    })
  }

  const [primera] = await prisma.loyaltyCard.findMany({ where: { businessId }, orderBy: { createdAt: "asc" }, take: 1 })
  if (primera && temaPro) {
    // La primera lleva un tema Pro elegido, para ver a qué cae al degradar.
    await prisma.loyaltyCard.update({
      where: { id: primera.id },
      data: { selectedThemeId: temaPro.id, effectiveThemeId: temaPro.id },
    })
  }

  await activateManualSubscription(prisma, {
    businessId,
    plan: "LITE",
    proAccessGranted: true,
    periodStart: inicio,
    periodEnd: new Date(ahora + 300 * 24 * 60 * 60 * 1000),
    operator: "e2e-fixture",
    action: "activate",
    idempotencyKey: `e2e-expired-trial:${businessId}:${finDelTrial.toISOString()}`,
  })

  // La fecha se escribe aquí y no como argumento: `proTrialEndsAt` solo entra
  // en la firma de `activateManualSubscription` a partir de FID-0026, y este
  // fixture tiene que funcionar en las dos ramas. La columna sí existe en las
  // dos, así que el estado queda igual.
  await prisma.subscription.updateMany({
    where: { businessId, status: "ACTIVE" },
    data: { proTrialEndsAt: finDelTrial },
  })

  return { proTheme: temaPro?.code ?? null, proTrialEndsAt: finDelTrial.toISOString() }
}

main()
  .catch((error) => {
    console.error("Failed to prepare onboarding E2E fixture:", error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
