import { describe, it, expect } from "vitest"
import type { AuthService, AuthSession, AuthUser } from "../auth"

class MockAuthService implements AuthService {
  private user = {
    id: "user-1",
    email: "test@test.com",
    name: "Test User",
  }

  async getSession() {
    return {
      user: this.user,
      accessToken: "mock-token",
    }
  }

  async signIn(email: string, password: string) {
    if (!email || !password) throw new Error("Invalid credentials")
    return {
      user: { id: "user-1", email, name: email.split("@")[0] },
      accessToken: "mock-token",
    }
  }

  async signUp(email: string, password: string, name: string) {
    if (!email || !password || !name) throw new Error("Missing fields")
    return {
      user: { id: "user-new", email, name },
      accessToken: "mock-token",
    }
  }

  async signOut() {}

  async getUser() {
    const session = await this.getSession()
    return session?.user ?? null
  }

  async sendMagicLink(_email: string, _options?: { redirectTo?: string }) {}

  async signInWithOAuth(_provider: string, _options?: { redirectTo?: string }) {}
}

function createSut() {
  return new MockAuthService()
}

describe("AuthService interface contract", () => {
  it("returns a session with user and accessToken", async () => {
    const auth = createSut()
    const session = await auth.getSession()
    expect(session).not.toBeNull()
    expect(session!.user.id).toBeTruthy()
    expect(session!.user.email).toBeTruthy()
    expect(session!.accessToken).toBeTruthy()
  })

  it("signs in with email and password", async () => {
    const auth = createSut()
    const session = await auth.signIn("alice@test.com", "secret123")
    expect(session.user.email).toBe("alice@test.com")
    expect(session.user.name).toBe("alice")
    expect(session.accessToken).toBe("mock-token")
  })

  it("throws on invalid sign in", async () => {
    const auth = createSut()
    await expect(auth.signIn("", "")).rejects.toThrow("Invalid credentials")
  })

  it("signs up a new user", async () => {
    const auth = createSut()
    const session = await auth.signUp("new@test.com", "pass123", "New User")
    expect(session.user.email).toBe("new@test.com")
    expect(session.user.name).toBe("New User")
    expect(session.user.id).toBeTruthy()
  })

  it("throws on invalid sign up", async () => {
    const auth = createSut()
    await expect(auth.signUp("", "", "")).rejects.toThrow("Missing fields")
  })

  it("signs out without error", async () => {
    const auth = createSut()
    await expect(auth.signOut()).resolves.toBeUndefined()
  })

  it("getUser returns the authenticated user", async () => {
    const auth = createSut()
    const user = await auth.getUser()
    expect(user).not.toBeNull()
    expect(user!.id).toBe("user-1")
  })

  it("getUser returns null when not authenticated", async () => {
    const auth = new (class implements AuthService {
      getSession(): Promise<AuthSession | null> {
        return Promise.resolve(null)
      }
      signIn(_email: string, _password: string): Promise<AuthSession> {
        throw new Error("No")
      }
      signUp(_email: string, _password: string, _name: string): Promise<AuthSession> {
        throw new Error("No")
      }
      signOut(): Promise<void> {
        return Promise.resolve()
      }
      async getUser(): Promise<AuthUser | null> {
        const session = await this.getSession()
        if (!session) return null
        return session.user
      }
      async sendMagicLink(_email: string, _options?: { redirectTo?: string }) {}
      async signInWithOAuth(_provider: string, _options?: { redirectTo?: string }) {}
    })()
    const user = await auth.getUser()
    expect(user).toBeNull()
  })

  it("AuthSession contains an AuthUser with optional name", () => {
    const session: AuthSession = {
      user: { id: "x", email: "a@b.com" },
      accessToken: "tok",
    }
    expect(session.user.name).toBeUndefined()

    const withName: AuthSession = {
      user: { id: "y", email: "c@d.com", name: "Alice" },
      accessToken: "tok2",
    }
    expect(withName.user.name).toBe("Alice")
  })
})
