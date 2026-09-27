import { test, expect } from "@playwright/test"
import { Prisma, PrismaClient } from "@prisma/client"

test("onboarding mutations retain the catalog and account context through the paywall", async ({ page }) => {
  // Only the dedicated CI fixture on local Supabase may be reset.
  expect(process.env.FID_0019_LOCAL_E2E).toBe("true")
  for (const key of ["DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_BASE_URL"]) {
    expect(["localhost", "127.0.0.1", "[::1]"]).toContain(new URL(process.env[key] ?? "").hostname)
  }
  const email = process.env.E2E_PORTAL_EMAIL
  const password = process.env.E2E_PORTAL_PASSWORD
  expect(email).toBe("fidelity.seed.portal@dev.invalid")
  expect(password).toBeTruthy()

  const db = new PrismaClient()
  let fixture: { userId: string; businessId: string; name: string; categoryId: string | null; firstCardId: string | null } | undefined
  try {
    const user = await db.user.findUniqueOrThrow({ where: { email } })
    const business = await db.business.findUniqueOrThrow({ where: { id: user.businessId! } })
    const previous = await db.onboardingProgress.findUnique({ where: { userId: user.id } })
    fixture = { userId: user.id, businessId: business.id, name: business.name, categoryId: business.categoryId, firstCardId: previous?.firstCardId ?? null }
    await db.onboardingProgress.upsert({
      where: { userId: user.id },
      create: { userId: user.id, businessId: user.businessId },
      update: {
        step: "INTRO", status: "IN_PROGRESS", draftVersion: 0,
        businessDraft: Prisma.DbNull, cardDraft: Prisma.DbNull, firstCardId: null,
        acquisitionSource: null, selectedBillingInterval: null,
      },
    })

    await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill(email!)
    await page.getByRole("button", { name: "Continuar", exact: true }).click()
    await page.locator('input[name="password"]').fill(password!)
    await page.getByRole("button", { name: "Iniciar sesión" }).click()
    await page.waitForURL("**/dashboard")

    const initialResponse = await page.request.get("/api/onboarding")
    expect(initialResponse.ok()).toBe(true)
    const initial = await initialResponse.json()
    expect(initial.categories.length).toBeGreaterThan(0)
    expect(initial.themes.length).toBeGreaterThan(0)
    let current = initial
    const mutate = async (method: "post" | "patch", data: Record<string, unknown>) => {
      const response = await page.request[method]("/api/onboarding", {
        data: { ...data, draftVersion: current.onboarding.onboardingProgress.draftVersion },
      })
      expect(response.ok(), await response.text()).toBe(true)
      current = await response.json()
      expect(current.categories).toEqual(initial.categories)
      expect(current.themes).toEqual(initial.themes)
      expect(current.accountContext.user).toEqual(initial.accountContext.user)
      expect(current.accountContext.plan).toBe(initial.accountContext.plan)
      expect(current.accountContext.business.id).toBe(initial.accountContext.business.id)
      expect(current.mode).toBe("live")
    }

    await mutate("post", { action: "skip_intro" })
    expect(current.onboarding.onboardingProgress.step).toBe("BUSINESS")
    await mutate("patch", { business: { name: "Onboarding API CI", categoryId: current.categories[0].id } })
    await mutate("post", { action: "complete_business" })
    expect(current.onboarding.onboardingProgress.step).toBe("CARD")
    await mutate("patch", { card: { reward: "Coffee", stampsRequired: 8 } })
    await mutate("post", { action: "complete_card" })
    const cardId = current.onboarding.onboardingProgress.firstCardId
    expect(cardId).toBeTruthy()
    await mutate("post", { action: "complete_card" })
    expect(current.onboarding.onboardingProgress.firstCardId).toBe(cardId)
    await mutate("post", { action: "skip_acquisition" })
    await mutate("post", { action: "open_paywall" })
    expect(current.onboarding.onboardingProgress).toMatchObject({ step: "PAYWALL", status: "AWAITING_PAYMENT" })
    expect(await db.loyaltyCard.findUnique({ where: { id: cardId } })).toMatchObject({ status: "DRAFT", isActive: false })
  } finally {
    try {
      if (fixture) {
        const progress = await db.onboardingProgress.findUnique({ where: { userId: fixture.userId } })
        await db.onboardingProgress.updateMany({ where: { userId: fixture.userId }, data: { firstCardId: fixture.firstCardId } })
        if (progress?.firstCardId && progress.firstCardId !== fixture.firstCardId) {
          await db.loyaltyCard.delete({ where: { id: progress.firstCardId } })
        }
        await db.business.update({ where: { id: fixture.businessId }, data: { name: fixture.name, categoryId: fixture.categoryId } })
      }
    } finally {
      await db.$disconnect()
    }
  }
})
