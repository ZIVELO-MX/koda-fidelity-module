import { NextRequest, NextResponse } from "next/server"
import { createSupabaseReqResClient } from "@/lib/supabase-req-res"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? ""
  // Un destino explícito y propio del sitio manda sobre el de por defecto.
  const destinoPedido =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null
  const next = destinoPedido ?? "/dashboard/my-cards"

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)
    const { supabase } = createSupabaseReqResClient(request, response)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Sin destino pedido, un correo de negocio entra a su panel. Con destino
      // pedido no: el enlace de recuperación apunta a la pantalla de
      // contraseña, y mandar al panel dejaba al dueño dentro pero sin poder
      // cambiarla, que es justo lo que había ido a hacer.
      const email = destinoPedido ? null : data.session?.user?.email
      if (email) {
        const business = await prisma.business.findUnique({ where: { email }, select: { id: true } })
        if (business) {
          const bizResponse = NextResponse.redirect(`${origin}/dashboard`)
          response.headers.getSetCookie().forEach((c) => bizResponse.headers.append("Set-Cookie", c))
          return bizResponse
        }
      }
      return response
    }
  }

  return NextResponse.redirect(`${origin}/auth/error?error=OAuth%20callback%20error`)
}
