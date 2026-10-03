import { NextRequest, NextResponse } from "next/server"
import { createSupabaseReqResClient } from "@/lib/supabase-req-res"
import { isSupportedAuthType, resolveAuthRedirect } from "@/lib/auth-redirect"
import { prisma } from "@/lib/prisma"

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

  if (!isSupportedAuthType(type)) {
    return NextResponse.redirect(
      new URL("/auth/error?error_code=invalid_type", request.url),
    )
  }

  const redirectUrl = resolveAuthRedirect(type, redirect_to, new URL(request.url).origin)
  const response = NextResponse.redirect(redirectUrl)

  const { supabase } = createSupabaseReqResClient(request, response)

  const { data, error } = await supabase.auth.verifyOtp({
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

  if (type !== "recovery" && data.user) {
    const member = await prisma.user.findUnique({
      where: { authUserId: data.user.id },
      select: {
        passwordSetupRequired: true,
        onboardingProgress: { select: { status: true } },
      },
    })
    if (member?.passwordSetupRequired) {
      const destination = NextResponse.redirect(new URL("/dashboard/update-password", request.url))
      response.headers.getSetCookie().forEach((cookie) => destination.headers.append("Set-Cookie", cookie))
      return destination
    }
    if (member?.onboardingProgress && member.onboardingProgress.status !== "ACTIVE") {
      const destination = NextResponse.redirect(new URL("/onboarding", request.url))
      response.headers.getSetCookie().forEach((cookie) => destination.headers.append("Set-Cookie", cookie))
      return destination
    }
  }

  return response
}
