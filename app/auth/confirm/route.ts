import { NextRequest, NextResponse } from "next/server"
import { createSupabaseReqResClient } from "@/lib/supabase-req-res"

const AUTH_TYPES = new Set(["magiclink", "signup", "invite", "recovery", "email_change", "email"])

export function resolveAuthRedirect(type: string, requested: string | null, origin: string) {
  const fallback = type === "recovery" ? "/dashboard/update-password" : "/dashboard/my-cards"
  if (type === "recovery") return new URL(fallback, origin)
  if (!requested) return new URL(fallback, origin)

  try {
    const candidate = new URL(requested, origin)
    if (candidate.origin !== origin || !candidate.pathname.startsWith("/") || candidate.pathname.startsWith("//")) {
      return new URL(fallback, origin)
    }
    return candidate
  } catch {
    return new URL(fallback, origin)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const redirect_to = searchParams.get("redirect_to")

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL("/auth/error?error_code=missing_params", request.url),
    )
  }

  if (!AUTH_TYPES.has(type)) {
    return NextResponse.redirect(
      new URL("/auth/error?error_code=invalid_type", request.url),
    )
  }

  const redirectUrl = resolveAuthRedirect(type, redirect_to, new URL(request.url).origin)
  const response = NextResponse.redirect(redirectUrl)

  const { supabase } = createSupabaseReqResClient(request, response)

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as "magiclink" | "signup" | "invite" | "recovery" | "email_change" | "email",
  })

  if (error) {
    console.error("[auth/confirm] verifyOtp failed:", {
      message: error.message,
      code: (error as any)?.code,
      status: (error as any)?.status,
    })

    const errorCode = (error as any)?.code || ""
    const errorParams = new URLSearchParams({ error: error.message })
    if (errorCode) errorParams.set("error_code", errorCode)

    return NextResponse.redirect(
      new URL(`/auth/error?${errorParams.toString()}`, request.url),
    )
  }

  return response
}
