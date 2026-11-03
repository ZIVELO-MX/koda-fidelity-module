import { randomBytes } from "node:crypto"

/**
 * Contraseña temporal de un solo uso para las cuentas que crean los scripts.
 * Antes todas compartían una fija que está en el historial de git: quien la
 * conociera entraba antes que el dueño. base64url da letras, dígitos, «-» y
 * «_»; 12 bytes son unos 16 caracteres, y el prefijo cumple las reglas de
 * contraseña (mayúscula y carácter especial).
 */
export function generateTempPassword(): string {
  return `Koda-${randomBytes(12).toString("base64url")}`
}
