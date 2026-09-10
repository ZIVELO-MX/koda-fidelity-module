import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAccountPrincipal, getBusinessFromSession, handleApiError, ValidationError, requireRole, requestIdFrom, withRequestId } from "@/lib/api-utils"
import { cancelClosure, previewClosure, scheduleClosure } from "@/lib/account-lifecycle"

function hasRecentSignIn(lastSignInAt?: string) {
  return Boolean(lastSignInAt && Date.now() - new Date(lastSignInAt).getTime() <= 10 * 60 * 1000)
}

/**
 * @openapi
 * /api/account/closure:
 *   get:
 *     tags: [Account]
 *     summary: Preview account closure
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Closure impact and schedule } }
 *   post:
 *     tags: [Account]
 *     summary: Schedule or cancel account closure
 *     security: [{ cookieAuth: [] }]
 *     responses: { 201: { description: Closure scheduled } }
 */

export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const { business } = await getBusinessFromSession()
    return withRequestId(NextResponse.json(await previewClosure(prisma, business.id)), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}

export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const principal = await getAccountPrincipal()
    const { business, user } = await getBusinessFromSession()
    requireRole(user, "admin")
    if (!hasRecentSignIn(principal.last_sign_in_at)) throw new ValidationError("Confirma tu identidad iniciando sesión nuevamente antes de cerrar la cuenta")
    const body = await request.json().catch(() => ({}))
    if (body.action === "cancel") return withRequestId(NextResponse.json({ closure: await cancelClosure(prisma, business.id) }), requestId)
    return withRequestId(NextResponse.json({ closure: await scheduleClosure(prisma, business.id) }, { status: 201 }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
