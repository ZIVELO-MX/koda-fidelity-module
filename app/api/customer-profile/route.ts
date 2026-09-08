import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAccountPrincipal, getBusinessFromSession, handleApiError, ValidationError } from "@/lib/api-utils"
import { createCustomerProfile } from "@/lib/account-lifecycle"

export async function GET() {
  try {
    const { business } = await getBusinessFromSession()
    const profile = await prisma.customerProfile.findFirst({ where: { businessId: business.id }, orderBy: { createdAt: "asc" } })
    return NextResponse.json({ profile })
  } catch (error) { return handleApiError(error) }
}

export async function PUT(request: NextRequest) {
  try {
    const principal = await getAccountPrincipal()
    const { business } = await getBusinessFromSession()
    const body = await request.json()
    if (typeof body.name !== "string" || !body.name.trim()) throw new ValidationError("Nombre requerido")
    const profile = await createCustomerProfile(prisma, { businessId: business.id, authUserId: principal.id, email: principal.email ?? String(body.email ?? ""), name: body.name, avatarPath: body.avatarPath ?? null })
    return NextResponse.json({ profile })
  } catch (error) { return handleApiError(error) }
}
