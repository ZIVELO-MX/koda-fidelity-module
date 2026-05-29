import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseReqResClient } from "@/lib/supabase-req-res"

export async function proxy(request: NextRequest) {
  const { supabase, response: supabaseResponse } =
    createSupabaseReqResClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard")
  const isMyCards = request.nextUrl.pathname.startsWith("/dashboard/my-cards")
  const isLogin = request.nextUrl.pathname === "/login"
  const isAuthPage = isLogin || request.nextUrl.pathname === "/signup"

  if (isDashboard && !isMyCards && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
}
