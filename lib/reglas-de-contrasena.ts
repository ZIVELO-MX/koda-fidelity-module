/**
 * Las reglas de la contraseña, en un solo sitio.
 *
 * El registro pedía ocho caracteres, una mayúscula y un carácter especial,
 * mientras que la pantalla de cambio se conformaba con la longitud. Por la
 * segunda puerta -- la invitación y la recuperación -- se entraba con una
 * contraseña que la primera habría rechazado.
 */
export const REGLAS_DE_CONTRASENA: { etiqueta: string; cumple: (clave: string) => boolean }[] = [
  { etiqueta: "Mínimo 8 caracteres", cumple: (c) => c.length >= 8 },
  { etiqueta: "Una letra mayúscula (A–Z)", cumple: (c) => /[A-Z]/.test(c) },
  {
    etiqueta: "Un carácter especial (!@#$%...)",
    cumple: (c) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(c),
  },
]

export function cumpleLasReglas(clave: string): boolean {
  return REGLAS_DE_CONTRASENA.every((regla) => regla.cumple(clave))
}

/** El primer requisito que falta, para decirlo en vez de rechazar sin más. */
export function reglaQueFalta(clave: string): string | null {
  return REGLAS_DE_CONTRASENA.find((regla) => !regla.cumple(clave))?.etiqueta ?? null
}
