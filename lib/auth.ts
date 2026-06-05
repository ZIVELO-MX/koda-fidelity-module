export interface AuthUser {
  id: string
  email: string
  name?: string
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
}

export type AuthProvider = "supabase" | "custom"

export interface AuthService {
  getSession(): Promise<AuthSession | null>
  signIn(email: string, password: string): Promise<AuthSession>
  signUp(email: string, password: string, name: string): Promise<AuthSession>
  signOut(): Promise<void>
  getUser(): Promise<AuthUser | null>
  sendMagicLink(email: string, options?: { redirectTo?: string }): Promise<void>
  sendPasswordResetEmail(email: string, options?: { redirectTo?: string }): Promise<void>
  signInWithOAuth(provider: string, options?: { redirectTo?: string }): Promise<void>
}
