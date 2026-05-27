"use server"

import type { AuthSession } from "@/lib/auth"
import { authService } from "@/lib/auth-service"
import { config } from "@/lib/config"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export type AuthResult = { error?: string; success?: true }

export async function login(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) return { error: "Correo y contraseña requeridos" }

  try {
    await authService.signIn(email, password)
  } catch {
    return { error: "No fue posible iniciar sesión. Verifica tus datos." }
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
        data: { email, name },
      })
    }
    revalidatePath("/dashboard")
    redirect("/dashboard")
  }

  return { success: true }
}

export async function logout() {
  await authService.signOut()
  revalidatePath("/login")
  redirect("/login")
}
