"use server"

import { authService } from "@/lib/auth-service"
import { config } from "@/lib/config"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getFriendlySendError } from "@/lib/auth-errors"
import { createClient } from "@/lib/supabase-server"
import { enforceRateLimit, normalizeEmail } from "@/lib/auth-security"
import { provisionSignup } from "@/lib/signup-provisioning"
import { headers } from "next/headers"
import { randomUUID } from "node:crypto"
import { classifyLoginError } from "@/lib/auth-errors"

export type AuthResult = { error?: string; success?: true; isBusiness?: boolean }

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

  if (user?.user_metadata?.must_change_password) {
    redirect("/dashboard/update-password")
  }

  revalidatePath("/dashboard")
  redirect("/dashboard")
}

export async function updatePassword(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const password = formData.get("password") as string
  const confirm = formData.get("confirm") as string
  const nickname = (formData.get("nickname") as string | null)?.trim() || null

  if (!password || password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" }
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

  if (nickname && user?.email) {
    const userRecord = await prisma.user.findUnique({
    where: { authUserId: user.id },
      select: { businessId: true },
    })
    if (userRecord) {
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
  const name = formData.get("name") as string

  if (!email || !password || !name) return { error: "Todos los campos son requeridos" }

  const normalizedEmail = normalizeEmail(email)
  const requestHeaders = await headers()
  await enforceRateLimit("signup-identity", normalizedEmail, 3, 60 * 60 * 1000)
  await enforceRateLimit("signup-ip", requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown", 5, 60 * 60 * 1000)
  await prisma.signupIntent.upsert({ where: { email: normalizedEmail }, create: { email: normalizedEmail, name: name.trim() }, update: { name: name.trim(), status: "pending" } })
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password, options: { data: { name: name.trim() } } })
  if (error || !data.user) return { error: "No fue posible crear la cuenta. Revisa tus datos." }
  await prisma.signupIntent.update({ where: { email: normalizedEmail }, data: { authUserId: data.user.id } })
  if (data.session) {
    await provisionSignup(data.user.id)
    revalidatePath("/dashboard")
    redirect("/dashboard")
  }

  return { success: true }
}

export async function sendLoginMagicLink(email: string): Promise<AuthResult> {
  try {
    await enforceRateLimit("magic-link", normalizeEmail(email), 3, 15 * 60 * 1000)
    const requestHeaders = await headers()
    await enforceRateLimit("magic-link-ip", requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown", 20, 15 * 60 * 1000)
    await authService.sendMagicLink(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard/my-cards`,
    })
    return { success: true }
  } catch (err) {
    console.error("[sendLoginMagicLink] Error sending magic link:", err)
    return { error: getFriendlySendError(err) }
  }
}



export async function sendPasswordReset(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string
  if (!email || !email.includes("@")) return { error: "Ingresa un correo electrónico válido" }

  const redirectTo = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/auth/callback?next=/dashboard/update-password`

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
