/** Bloquea los fixtures destructivos fuera del Supabase local. */
export function exigirBaseLocal(env: Record<string, string | undefined>) {
  if (env.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error("El fixture exige ALLOW_DESTRUCTIVE_SEED=true y Supabase local")
  }
  for (const variable of ["DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL"] as const) {
    let host: string
    try {
      host = new URL(env[variable] ?? "").hostname
    } catch {
      throw new Error(`El fixture exige ${variable} con una URL local`)
    }
    if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
      throw new Error(`El fixture rechaza ${variable} fuera de localhost`)
    }
  }
}
