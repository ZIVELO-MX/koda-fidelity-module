export interface AuthErrorMessage {
  title: string
  description: string
}

export type LoginErrorKind = "invalid_credentials" | "rate_limited" | "infrastructure"
export type SignupErrorKind = "account_may_exist" | "invalid_email" | "weak_password" | "rate_limited" | "signup_unavailable" | "unknown"

/** Maps provider and server errors to a safe, stable login category. */
export function classifyLoginError(error: unknown): LoginErrorKind {
  const message = error instanceof Error ? error.message.toLowerCase() : ""
  const code = String((error as { code?: unknown })?.code ?? "").toLowerCase()
  const status = (error as { status?: unknown })?.status

  if (
    code === "rate_limited" ||
    code === "too_many_requests" ||
    message === "rate_limited" ||
    message === "rate_limit" ||
    message === "too many requests" ||
    status === 429
  ) return "rate_limited"

  if (
    code === "invalid_credentials" ||
    code === "invalid_login_credentials" ||
    message === "invalid login credentials" ||
    message === "invalid credentials" ||
    message === "email not confirmed"
  ) return "invalid_credentials"

  return "infrastructure"
}

/** Maps stable Supabase Auth error codes to safe signup guidance. */
export function classifySignupError(error: unknown): SignupErrorKind {
  const code = String((error as { code?: unknown })?.code ?? "").toLowerCase()

  if (code === "user_already_exists" || code === "email_exists") return "account_may_exist"
  if (code === "email_address_invalid") return "invalid_email"
  if (code === "weak_password") return "weak_password"
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") return "rate_limited"
  if (code === "signup_disabled" || code === "email_provider_disabled" || code === "email_address_not_authorized") return "signup_unavailable"
  return "unknown"
}

export function getFriendlySignupError(error: unknown, requestId: string): string {
  switch (classifySignupError(error)) {
    case "account_may_exist":
      return "No pudimos completar el registro. Si ya tienes una cuenta, inicia sesión o restablece tu contraseña."
    case "invalid_email":
      return "Revisa el formato del correo electrónico e inténtalo de nuevo."
    case "weak_password":
      return "La contraseña no cumple los requisitos indicados. Revisa las reglas y vuelve a intentarlo."
    case "rate_limited":
      return "Se hicieron demasiados intentos. Espera unos minutos antes de volver a intentarlo."
    case "signup_unavailable":
      return "El registro por correo no está disponible con la configuración actual. Contacta con soporte."
    default: {
      const rawCode = (error as { code?: unknown } | null)?.code
      const code = typeof rawCode === "string" && /^[a-z0-9_-]{1,64}$/i.test(rawCode) ? rawCode : null
      const reason = code ? ` Código de error: ${code}.` : ""
      return `No pudimos crear tu cuenta por un problema temporal.${reason} Inténtalo de nuevo. Código de referencia: ${requestId}`
    }
  }
}

export function getFriendlyAuthError(error: string, errorCode: string): AuthErrorMessage | null {
  const message = error.toLowerCase()
  if (errorCode === "otp_expired" || message.includes("expired") || message.includes("otp_expired")) {
    return {
      title: "Enlace Expirado",
      description: "El enlace ya no es válido. Inicia sesión para solicitar uno nuevo.",
    }
  }
  if (errorCode === "rate_limit" || message.includes("rate_limit") || message.includes("rate limit") || message.includes("over_email_send_rate_limit") || message.includes("too many")) {
    return {
      title: "Demasiados Intentos",
      description: "El límite de correos está agotado. Usa Google para entrar o espera unos minutos.",
    }
  }
  if (message.includes("invalid") || message.includes("not found") || message.includes("token")) {
    return {
      title: "Enlace No Válido",
      description: "El enlace no es válido. Puede que ya se haya usado o que sea incorrecto. Inicia sesión para solicitar otro.",
    }
  }
  if (message.includes("email not confirmed")) {
    return {
      title: "Correo No Confirmado",
      description: "Tu correo electrónico no ha sido confirmado. Revisa tu bandeja de entrada para encontrar el enlace de confirmación.",
    }
  }
  return null
}

export function getFriendlySendError(err: unknown): string {
  const message = err instanceof Error ? err.message : ""
  const code = (err as any)?.code ?? ""

  if (
    code === "over_email_send_rate_limit" ||
    message.includes("rate_limit") ||
    message.includes("rate limit") ||
    message.includes("over_email_send_rate_limit") ||
    message.includes("too many")
  ) {
    return "El límite de correos está agotado. Usa Google para entrar o espera unos minutos."
  }
  if (message.includes("invalid") || message.includes("not found")) {
    return "Correo electrónico no válido. Verifica e intenta de nuevo."
  }
  return "No fue posible enviar el correo."
}
