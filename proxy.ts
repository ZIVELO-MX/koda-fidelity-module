import { NextRequest, NextResponse } from "next/server"
import { createSupabaseReqResClient } from "@/lib/supabase-req-res"
import { randomUUID } from "node:crypto"

export async function proxy(request: NextRequest) {
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
  matcher: ["/api/:path*", "/dashboard/:path*", "/login", "/signup"],
}
