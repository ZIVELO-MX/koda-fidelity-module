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

  console.log(JSON.stringify({ email, businessId: user.businessId, plan, onboarding: "reset" }))
}

main()
  .catch((error) => {
    console.error("Failed to prepare onboarding E2E fixture:", error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
