export function isDebugAuthEnabled() {
  if (process.env.FID_DEBUG_AUTH !== "true") return false
  if (process.env.VERCEL_ENV === "production") return false
  if (process.env.VERCEL_ENV === "preview") return true
  if (process.env.NODE_ENV === "production") return false
  return true
}

export const config = {
  get isInviteOnly() {
    return process.env.INVITE_ONLY === "true"
  },
  get isDebugAuthEnabled() { return isDebugAuthEnabled() },
  isDebugEmail(email: string) {
    return this.isDebugAuthEnabled && email.toLowerCase().endsWith("@invalid.dev")
  },
}
