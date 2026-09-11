import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAccountPrincipal, handleApiError, ValidationError, requestIdFrom, withRequestId } from "@/lib/api-utils"
import { createCustomerProfile } from "@/lib/account-lifecycle"

/**
 * @openapi
 * /api/customer-profile:
 *   get:
 *     tags: [Customer]
 *     summary: Get the authenticated customer profile
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Customer profile } }
 *   put:
 *     tags: [Customer]
 *     summary: Create or update the customer profile
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Customer profile } }
 *   patch:
 *     tags: [Customer]
 *     summary: Update customer profile fields
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Customer profile } }
 */

export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const principal = await getAccountPrincipal()
    const profile = await prisma.customerProfile.findUnique({ where: { authUserId: principal.id } })
    return withRequestId(NextResponse.json({ profile }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}

export async function PUT(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const principal = await getAccountPrincipal()
    const body = await request.json()
    if (typeof body.name !== "string" || !body.name.trim()) throw new ValidationError("Nombre requerido")
    const profile = await createCustomerProfile(prisma, { authUserId: principal.id, email: principal.email ?? "", name: body.name, avatarPath: body.avatarPath ?? null })
    return withRequestId(NextResponse.json({ profile }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}

export async function PATCH(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const principal = await getAccountPrincipal()
    const body = await request.json()
    if (body.avatarRingColor !== undefined && (typeof body.avatarRingColor !== "string" || !/^#[0-9a-f]{6}$/i.test(body.avatarRingColor))) {
      throw new ValidationError("El color del marco debe ser hexadecimal")
    }
    const profile = await prisma.customerProfile.update({ where: { authUserId: principal.id }, data: { ...(body.name !== undefined && { name: String(body.name).trim() }), ...(body.avatarRingColor !== undefined && { avatarRingColor: body.avatarRingColor }) } })
    return withRequestId(NextResponse.json({ profile }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
