export interface AuthErrorMessage {
  title: string
  description: string
}

export function getFriendlyAuthError(error: string, errorCode: string): AuthErrorMessage | null {
  const message = error.toLowerCase()
  if (errorCode === "otp_expired" || message.includes("expired") || message.includes("otp_expired")) {
    return {
      title: "Enlace Expirado",
      description: "El enlace mágico que clickeaste ya no es válido. Solicita uno nuevo abajo.",
    }
  }
  if (errorCode === "rate_limit" || message.includes("rate_limit") || message.includes("rate limit") || message.includes("over_email_send_rate_limit") || message.includes("too many")) {
    return {
      title: "Demasiados Intentos",
      description: "El límite de enlaces por correo está agotado. Usa Google para acceder al instante o espera unos minutos.",
    }
  }
  if (message.includes("invalid") || message.includes("not found") || message.includes("token")) {
    return {
      title: "Enlace No Válido",
      description: "El enlace que clickeaste no es válido. Es posible que ya haya sido usado o que sea incorrecto. Solicita uno nuevo abajo.",
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
    return "El límite de enlaces por correo está agotado. Usa Google para acceder al instante o espera unos minutos."
  }
  if (message.includes("invalid") || message.includes("not found")) {
    return "Correo electrónico no válido. Verifica e intenta de nuevo."
  }
  return "No fue posible enviar el enlace."
}
