import { NextRequest, NextResponse } from "next/server"
import { createSupabaseReqResClient } from "@/lib/supabase-req-res"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const redirect_to = searchParams.get("redirect_to")

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL("/auth/error", request.url))
  }

  const redirectUrl = new URL(redirect_to || "/dashboard/my-cards", request.url)
  const response = NextResponse.redirect(redirectUrl)

  const { supabase } = createSupabaseReqResClient(request, response)

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as "magiclink" | "signup" | "invite" | "recovery" | "email_change" | "email",
  })

  if (error) {
    console.error("Auth confirm error:", error.message)
    return NextResponse.redirect(
      new URL(
        `/auth/error?error=${encodeURIComponent(error.message)}`,
        request.url,
      ),
    )
  }

  return response
}
