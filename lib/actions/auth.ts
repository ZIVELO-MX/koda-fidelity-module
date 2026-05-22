"use server"

import { authService } from "@/lib/auth-service"
import { config } from "@/lib/config"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export type AuthResult = { error?: string; success?: true }

export async function login(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) return { error: "Correo y contraseña requeridos" }

  try {
    await authService.signIn(email, password)
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al iniciar sesión" }
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

  try {
    const result = await authService.signUp(email, password, name)
    if (result.user) {
      revalidatePath("/dashboard")
      redirect("/dashboard")
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al registrarse" }
  }

  return { success: true }
}

export async function logout() {
  await authService.signOut()
  revalidatePath("/login")
  redirect("/login")
}
