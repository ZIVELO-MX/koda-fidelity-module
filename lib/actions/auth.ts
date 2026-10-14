"use server"

import { authService } from "@/lib/auth-service"
import { config } from "@/lib/config"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { enforceRateLimit, normalizeEmail } from "@/lib/auth-security"
import { provisionSignup } from "@/lib/signup-provisioning"
import { headers } from "next/headers"
import { randomUUID } from "node:crypto"
import { classifyLoginError, getFriendlySignupError } from "@/lib/auth-errors"
import { reglaQueFalta } from "@/lib/reglas-de-contrasena"
import { safeNextPath } from "@/lib/api-utils"

export type AuthResult = { error?: string; success?: true }

export async function login(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) return { error: "Correo y contraseña requeridos" }

  const requestId = randomUUID()
  try {
    const requestHeaders = await headers()
    await enforceRateLimit("login-identity", normalizeEmail(email), 10, 15 * 60 * 1000)
    await enforceRateLimit("login-ip", requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown", 30, 15 * 60 * 1000)
    await authService.signIn(email, password)
  } catch (err) {
    const kind = classifyLoginError(err)
    if (kind === "invalid_credentials") {
      return { error: "Correo o contraseña incorrectos." }
    }
    if (kind === "rate_limited") {
      return { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." }
    }

    const error = err instanceof Error ? err : new Error("Unknown login error")
    const domain = email.includes("@") ? email.slice(email.indexOf("@") + 1).toLowerCase() : "unknown"
    console.error("[login] Unexpected authentication failure", {
      requestId,
      errorName: error.name,
      errorMessage: error.message,
      emailDomain: domain,
    })
    return { error: `No fue posible iniciar sesión temporalmente. Código de referencia: ${requestId}` }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const member = user
    ? await prisma.user.findUnique({
        where: { authUserId: user.id },
        select: { passwordSetupRequired: true, businessId: true, onboardingProgress: { select: { status: true } } },
      })
    : null

  if (member?.passwordSetupRequired) {
    redirect("/dashboard/update-password")
  }

  if (member && !member.businessId) redirect("/onboarding")
  if (member?.onboardingProgress?.status === "IN_PROGRESS") redirect("/onboarding")
  if (user && await prisma.customerProfile.findUnique({ where: { authUserId: user.id }, select: { id: true } })) redirect(safeNextPath(String(formData.get("next") ?? ""), "/dashboard/my-cards"))
  revalidatePath("/dashboard")
  redirect(safeNextPath(String(formData.get("next") ?? ""), "/dashboard"))
}

export async function updatePassword(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const password = formData.get("password") as string
  const confirm = formData.get("confirm") as string
  const nickname = (formData.get("nickname") as string | null)?.trim() || null

  const missingRule = reglaQueFalta(password ?? "")
  if (missingRule) return { error: `A la contraseña le falta: ${missingRule.toLowerCase()}` }
  if (password !== confirm) return { error: "Las contraseñas no coinciden" }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.updateUser({
    password,
    data: { must_change_password: false },
  })

  if (error) {
    console.error("[updatePassword] Error:", error)
    return { error: "No fue posible actualizar la contraseña. Intenta de nuevo." }
  }

  if (nickname && user) {
    const userRecord = await prisma.user.findUnique({
      where: { authUserId: user.id },
      select: { businessId: true },
    })
    if (userRecord?.businessId) {
      await prisma.business.update({
        where: { id: userRecord.businessId },
        data: { nickname },
      })
    }
  }
  if (user) await prisma.user.updateMany({ where: { authUserId: user.id }, data: { passwordSetupRequired: false } })

  revalidatePath("/dashboard")
  redirect("/dashboard")
}

export async function signup(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  if (config.isInviteOnly) {
    return { error: "El registro está cerrado por ahora. Koda Fidelity está en beta privado." }
  }

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const confirm = formData.get("confirm") as string
  const accountType = formData.get("accountType")
  const next = String(formData.get("next") ?? "")
  const name = (formData.get("name") as string | null)?.trim() || null

  if (!email || !email.includes("@") || !password || !["BUSINESS", "CUSTOMER"].includes(String(accountType))) return { error: "Completa todos los campos con información válida" }
  if (!confirm || password !== confirm) return { error: "Las contraseñas no coinciden" }
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" }
  if (accountType === "CUSTOMER" && (!name || name.length > 120)) return { error: "Ingresa tu nombre (máximo 120 caracteres)" }

  const requestId = randomUUID()
  const normalizedEmail = normalizeEmail(email)
  const debugSignup = config.isDebugEmail(normalizedEmail)
  const requestHeaders = await headers()
  await enforceRateLimit("signup-identity", normalizedEmail, 3, 60 * 60 * 1000)
  await enforceRateLimit("signup-ip", requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown", 5, 60 * 60 * 1000)
  try {
    await prisma.signupIntent.upsert({ where: { email: normalizedEmail }, create: { email: normalizedEmail, name, accountType: accountType as "BUSINESS" | "CUSTOMER" }, update: { name, accountType: accountType as "BUSINESS" | "CUSTOMER", status: "pending" } })
  } catch (error) {
    logSignupFailure("persist_intent", requestId, error)
    return { error: `No pudimos preparar tu registro. Inténtalo de nuevo. Código de referencia: ${requestId}` }
  }

  let data: { user: { id: string } | null; session: unknown | null }
  let error: { name?: string; code?: string; status?: number } | null
  try {
    if (debugSignup) {
      ({ data, error } = await createDebugUser(normalizedEmail, password, name || normalizedEmail.split("@")[0]))
    } else {
      const supabase = await createClient()
      const result = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}${safeNextPath(next, accountType === "CUSTOMER" ? "/dashboard/my-cards" : "/onboarding")}`,
        },
      })
      data = result.data
      error = result.error
    }
  } catch (error) {
    logSignupFailure("supabase_signup_exception", requestId, error)
    return { error: `No pudimos conectar con el servicio de registro. Inténtalo de nuevo. Código de referencia: ${requestId}` }
  }

  if (error) {
    logSignupFailure("supabase_auth_rejected", requestId, error)
    return { error: getFriendlySignupError(error, requestId) }
  }
  if (!data.user) {
    logSignupFailure("supabase_signup_missing_user", requestId)
    return { error: getFriendlySignupError(null, requestId) }
  }
  await prisma.signupIntent.update({ where: { email: normalizedEmail }, data: { authUserId: data.user.id } })
  if (debugSignup) {
    await authService.signIn(normalizedEmail, password)
    await provisionSignup(data.user.id)
    revalidatePath("/dashboard")
    redirect(safeNextPath(next, accountType === "CUSTOMER" ? "/dashboard/my-cards" : "/onboarding"))
  }
  if (data.session) {
    await provisionSignup(data.user.id)
    revalidatePath("/dashboard")
    redirect(safeNextPath(next, accountType === "CUSTOMER" ? "/dashboard/my-cards" : "/onboarding"))
  }

  return { success: true }
}

function logSignupFailure(stage: string, requestId: string, error?: unknown) {
  const details = error && typeof error === "object" ? error as { name?: unknown; code?: unknown; status?: unknown } : {}
  console.error("[signup] registration failed", {
    requestId,
    stage,
    errorName: typeof details.name === "string" ? details.name : undefined,
    errorCode: typeof details.code === "string" ? details.code : undefined,
    status: typeof details.status === "number" ? details.status : undefined,
  })
}

async function createDebugUser(email: string, password: string, name: string) {
  const admin = createAdminClient().auth.admin
  for (let page = 1; ; page += 1) {
    const listed = await admin.listUsers({ page, perPage: 1000 })
    if (listed.error) return { data: { user: null, session: null }, error: listed.error }
    const existing = listed.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (existing) return { data: { user: existing, session: null }, error: null }
    if (listed.data.users.length < 1000) break
  }
  const created = await admin.createUser({ email, password, email_confirm: true, user_metadata: { name } })
  return { data: { user: created.data.user, session: null }, error: created.error }
}

export async function sendPasswordReset(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string
  if (!email || !email.includes("@")) return { error: "Ingresa un correo electrónico válido" }

  // El destino dice a qué viene, para que la pantalla no le pida un apodo a
  // quien solo va a cambiar su contraseña.
  const destination = encodeURIComponent("/dashboard/update-password?reason=recovery")
  const redirectTo = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/auth/callback?next=${destination}`

  try {
    const requestHeaders = await headers()
    await enforceRateLimit("password-reset", normalizeEmail(email), 3, 15 * 60 * 1000)
    await enforceRateLimit("password-reset-ip", requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown", 20, 15 * 60 * 1000)
    await authService.sendPasswordResetEmail(email.trim(), { redirectTo })
    return { success: true }
  } catch (err) {
    console.error("[sendPasswordReset] Error:", err)
    return { error: "No fue posible enviar el correo. Verifica el correo e intenta de nuevo." }
  }
}

export async function logout() {
  await authService.signOut()
  revalidatePath("/login")
  redirect("/login")
}
