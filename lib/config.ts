export const config = {
  get isInviteOnly() {
    return process.env.INVITE_ONLY === "true"
  },
  get isDebugAuthEnabled() {
    if (process.env.FID_DEBUG_AUTH !== "true") return false
    if (process.env.VERCEL_ENV === "production") return false
    return process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview"
  },
  isDebugEmail(email: string) {
    return this.isDebugAuthEnabled && email.toLowerCase().endsWith("@invalid.dev")
  },
}
