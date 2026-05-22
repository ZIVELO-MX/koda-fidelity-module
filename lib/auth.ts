export interface AuthUser {
  id: string
  email: string
  name?: string
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
}

export interface AuthService {
  getSession(): Promise<AuthSession | null>
  signIn(email: string, password: string): Promise<AuthSession>
  signUp(email: string, password: string, name: string): Promise<AuthSession>
  signOut(): Promise<void>
  getUser(): Promise<AuthUser | null>
}
