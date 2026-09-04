import { NextRequest, NextResponse } from "next/server"
import { createSupabaseReqResClient } from "@/lib/supabase-req-res"
import { prisma } from "@/lib/prisma"
import { safeNextPath } from "@/lib/api-utils"
import { provisionSignup } from "@/lib/signup-provisioning"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? ""
  const next = safeNextPath(rawNext, "/dashboard/my-cards")

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)
    const { supabase } = createSupabaseReqResClient(request, response)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const authUser = data.session?.user
      if (authUser) {
        await provisionSignup(authUser.id)
        const member = await prisma.user.findUnique({ where: { authUserId: authUser.id }, select: { id: true } })
        if (member) {
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
