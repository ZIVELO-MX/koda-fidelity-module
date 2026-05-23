import type { AuthService, AuthSession, AuthUser } from "./auth"
import { createClient } from "./supabase-server"

export const authService: AuthService = {
  async getSession() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getSession()

    if (error || !data.session) return null

    return {
      user: {
        id: data.session.user.id,
        email: data.session.user.email ?? "",
        name: data.session.user.user_metadata?.name,
      },
      accessToken: data.session.access_token,
    }
  },

  async signIn(email: string, password: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) throw error

    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
        name: data.user.user_metadata?.name,
      },
      accessToken: data.session.access_token,
    }
  },

  async signUp(email: string, password: string, name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (error) throw error
    if (!data.session || !data.user) throw new Error("Confirmation email sent")

    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
        name,
      },
      accessToken: data.session.access_token,
    }
  },

  async signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
  },

  async getUser() {
    const session = await this.getSession()
    return session?.user ?? null
  },
}
