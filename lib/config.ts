export function isDebugAuthEnabled() {
  if (process.env.FID_DEBUG_AUTH !== "true") return false
  if (process.env.VERCEL_ENV === "production") return false
  if (process.env.VERCEL_ENV === "preview") return true
  if (process.env.NODE_ENV === "production") return false
  return true
}

/** Wallet issuance stays opt-in until certificates and publication are verified. */
export function isWalletEnabled() {
  return process.env.FID_WALLET_ENABLED === "true"
}

export const config = {
  get isInviteOnly() {
    return process.env.INVITE_ONLY === "true"
  },
  get isDebugAuthEnabled() { return isDebugAuthEnabled() },
  get isWalletEnabled() { return isWalletEnabled() },
  isDebugEmail(email: string) {
    return this.isDebugAuthEnabled && email.toLowerCase().endsWith("@invalid.dev")
  },
}
