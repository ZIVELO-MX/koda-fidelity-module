import { NextRequest, NextResponse } from "next/server"
import { createSupabaseReqResClient } from "@/lib/supabase-req-res"
import { randomUUID } from "node:crypto"

/**
 * Supabase devuelve el `code` del correo -- y los `error*` cuando algo falla --
 * a la raíz del sitio. Atender eso dentro de app/page.tsx obligaba a servir la
 * landing como dinámica y con `Cache-Control: no-store` en todas las visitas:
 * una página de marketing que no cambia, sin caché, por un caso que casi nunca
 * ocurre. Aquí se atiende antes, y la landing vuelve a ser estática.
 */
function callbackDeAuth(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const code = searchParams.get("code")
  if (code) {
    const destino = new URL("/auth/callback", request.url)
    destino.searchParams.set("code", code)
    destino.searchParams.set("next", searchParams.get("next") || "/dashboard/my-cards")
    return NextResponse.redirect(destino)
  }

  if (searchParams.get("error") || searchParams.get("error_code")) {
    const destino = new URL("/auth/error", request.url)
    for (const clave of ["error", "error_code", "error_description"]) {
      const valor = searchParams.get(clave)
      if (valor) destino.searchParams.set(clave, valor)
    }
    return NextResponse.redirect(destino)
  }

  return null
}

export async function proxy(request: NextRequest) {
  // La raíz sale por aquí sin tocar Supabase: pedirle el usuario en cada visita
  // a la landing sería cambiar una página sin caché por una llamada de red.
  if (request.nextUrl.pathname === "/") {
    return callbackDeAuth(request) ?? NextResponse.next()
  }

  const requestId = request.headers.get("x-request-id") ?? randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-request-id", requestId)
  const requestWithId = new NextRequest(request, { headers: requestHeaders })
  const { supabase, response: supabaseResponse } =
    createSupabaseReqResClient(requestWithId)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isDashboard = requestWithId.nextUrl.pathname.startsWith("/dashboard")
  const isMyCards = requestWithId.nextUrl.pathname.startsWith("/dashboard/my-cards")
  const isLogin = requestWithId.nextUrl.pathname === "/login"
  const isAuthPage = isLogin || requestWithId.nextUrl.pathname === "/signup"

  if (isDashboard && !isMyCards && !user) {
    const url = requestWithId.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (isAuthPage && user) {
    const url = requestWithId.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  if (requestWithId.nextUrl.pathname.startsWith("/api/")) {
    supabaseResponse.headers.set("x-request-id", requestId)
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/", "/api/:path*", "/dashboard/:path*", "/login", "/signup"],
}
