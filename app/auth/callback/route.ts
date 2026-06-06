import { NextRequest, NextResponse } from "next/server"
import { createSupabaseReqResClient } from "@/lib/supabase-req-res"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? ""
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard/my-cards"

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)
    const { supabase } = createSupabaseReqResClient(request, response)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const email = data.session?.user?.email
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
