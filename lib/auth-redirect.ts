const AUTH_TYPES = new Set(["magiclink", "signup", "invite", "recovery", "email_change", "email"])

export function isSupportedAuthType(type: string): boolean {
  return AUTH_TYPES.has(type)
}

export function resolveAuthRedirect(type: string, requested: string | null, origin: string): URL {
  const fallback = type === "recovery" ? "/dashboard/update-password" : "/dashboard/my-cards"
  if (type === "recovery" || !requested) return new URL(fallback, origin)

  try {
    const candidate = new URL(requested, origin)
    if (candidate.origin !== origin || !candidate.pathname.startsWith("/") || candidate.pathname.startsWith("//")) {
      return new URL(fallback, origin)
    }
    return candidate
  } catch {
    return new URL(fallback, origin)
  }
}
