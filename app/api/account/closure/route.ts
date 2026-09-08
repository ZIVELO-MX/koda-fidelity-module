import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAccountPrincipal, getBusinessFromSession, handleApiError, ValidationError, requireRole } from "@/lib/api-utils"
import { cancelClosure, previewClosure, scheduleClosure } from "@/lib/account-lifecycle"

function hasRecentSignIn(lastSignInAt?: string) {
  return Boolean(lastSignInAt && Date.now() - new Date(lastSignInAt).getTime() <= 15 * 60 * 1000)
}

export async function GET() {
  try {
    const { business } = await getBusinessFromSession()
    return NextResponse.json(await previewClosure(prisma, business.id))
  } catch (error) { return handleApiError(error) }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await getAccountPrincipal()
    const { business, user } = await getBusinessFromSession()
    requireRole(user, "admin")
    if (!hasRecentSignIn(principal.last_sign_in_at)) throw new ValidationError("Confirma tu identidad iniciando sesión nuevamente antes de cerrar la cuenta")
    const body = await request.json().catch(() => ({}))
    if (body.action === "cancel") return NextResponse.json({ closure: await cancelClosure(prisma, business.id) })
    return NextResponse.json({ closure: await scheduleClosure(prisma, business.id) }, { status: 201 })
  } catch (error) { return handleApiError(error) }
}
