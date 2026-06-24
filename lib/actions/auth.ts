"use server"

import type { AuthSession } from "@/lib/auth"
import { authService } from "@/lib/auth-service"
import { config } from "@/lib/config"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getFriendlySendError } from "@/lib/auth-errors"
import { createClient } from "@/lib/supabase-server"

const magicLinkCooldowns = new Map<string, number>()
const MAGIC_LINK_COOLDOWN_MS = 120_000

export type AuthResult = { error?: string; success?: true; isBusiness?: boolean }

export async function checkBusinessEmail(
  email: string
): Promise<{ isBusiness: boolean; nickname: string | null }> {
  const userRecord = await prisma.user.findUnique({
    where: { email },
    select: { id: true, business: { select: { nickname: true } } },
  })
  return { isBusiness: userRecord !== null, nickname: userRecord?.business?.nickname ?? null }
}

export async function login(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) return { error: "Correo y contraseña requeridos" }

  try {
    await authService.signIn(email, password)
  } catch (err) {
    console.error("[login] Error signing in:", err)
    return { error: "No fue posible iniciar sesión. Verifica tus datos." }
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
      where: { email: user.email },
      select: { businessId: true },
    })
    if (userRecord) {
      await prisma.business.update({
        where: { id: userRecord.businessId },
        data: { nickname },
      })
    }
  }

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

  let session: AuthSession | null = null
  try {
    const result = await authService.signUp(email, password, name)
    session = result
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al registrarse"
    if (message === "Confirmation email sent") {
      return { success: true }
    }
    return { error: "No fue posible crear la cuenta. Revisa tus datos." }
  }

  if (session?.user) {
    const existing = await prisma.business.findUnique({ where: { email } })
    if (!existing) {
      await prisma.business.create({
        data: {
          email,
          name,
          users: {
            create: { email, name, role: "admin" },
          },
        },
      })
    } else {
      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (!existingUser) {
        await prisma.user.create({ data: { email, name, role: "admin", businessId: existing.id } })
      }
    }
    revalidatePath("/dashboard")
    redirect("/dashboard")
  }

  return { success: true }
}

export async function sendLoginMagicLink(email: string): Promise<AuthResult> {
  const lastSent = magicLinkCooldowns.get(email)
  if (lastSent && Date.now() - lastSent < MAGIC_LINK_COOLDOWN_MS) {
    const remaining = Math.ceil((MAGIC_LINK_COOLDOWN_MS - (Date.now() - lastSent)) / 1000)
    return { error: `Ya enviamos un enlace recientemente. Revisa tu correo o espera ${remaining} segundos.` }
  }

  try {
    await authService.sendMagicLink(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard/my-cards`,
    })
    magicLinkCooldowns.set(email, Date.now())
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
