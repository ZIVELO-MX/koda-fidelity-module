import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Un Server Component no puede escribir cookies, y Supabase intenta
            // hacerlo al refrescar el token. Se ignora a propósito: el refresco
            // que cuenta lo hace el proxy, que sí puede escribirlas. Sin esta
            // guarda, cada refresco dejaba un unhandledRejection en el servidor.
          }
        },
      },
    },
  )
}
