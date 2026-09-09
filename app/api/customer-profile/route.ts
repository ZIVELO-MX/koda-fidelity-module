import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAccountPrincipal, handleApiError, ValidationError } from "@/lib/api-utils"
import { createCustomerProfile } from "@/lib/account-lifecycle"

export async function GET() {
  try {
    const principal = await getAccountPrincipal()
    const profile = await prisma.customerProfile.findUnique({ where: { authUserId: principal.id } })
    return NextResponse.json({ profile })
  } catch (error) { return handleApiError(error) }
}

export async function PUT(request: NextRequest) {
  try {
    const principal = await getAccountPrincipal()
    const body = await request.json()
    if (typeof body.name !== "string" || !body.name.trim()) throw new ValidationError("Nombre requerido")
    const profile = await createCustomerProfile(prisma, { authUserId: principal.id, email: principal.email ?? "", name: body.name, avatarPath: body.avatarPath ?? null })
    return NextResponse.json({ profile })
  } catch (error) { return handleApiError(error) }
}

export async function PATCH(request: NextRequest) {
  try {
    const principal = await getAccountPrincipal()
    const body = await request.json()
    if (body.avatarRingColor !== undefined && (typeof body.avatarRingColor !== "string" || !/^#[0-9a-f]{6}$/i.test(body.avatarRingColor))) {
      throw new ValidationError("El color del marco debe ser hexadecimal")
    }
    const profile = await prisma.customerProfile.update({ where: { authUserId: principal.id }, data: { ...(body.name !== undefined && { name: String(body.name).trim() }), ...(body.avatarRingColor !== undefined && { avatarRingColor: body.avatarRingColor }) } })
    return NextResponse.json({ profile })
  } catch (error) { return handleApiError(error) }
}
