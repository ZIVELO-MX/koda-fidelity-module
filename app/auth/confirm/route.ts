import { NextRequest, NextResponse } from "next/server"
import { createSupabaseReqResClient } from "@/lib/supabase-req-res"
import { isSupportedAuthType, resolveAuthRedirect } from "@/lib/auth-redirect"
import { provisionSignup } from "@/lib/signup-provisioning"
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

  if (type === "signup") {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await provisionSignup(user.id)
      const business = await prisma.user.findUnique({ where: { authUserId: user.id }, select: { businessId: true, onboardingProgress: { select: { status: true } } } })
      const customer = await prisma.customerProfile.findUnique({ where: { authUserId: user.id }, select: { id: true } })
      if (business && (!business.businessId || business.onboardingProgress?.status === "IN_PROGRESS") && !redirect_to) response.headers.set("location", new URL("/onboarding", request.url).toString())
      else if (customer && !redirect_to) response.headers.set("location", new URL("/dashboard/my-cards", request.url).toString())
    }
  }
  return response
}
