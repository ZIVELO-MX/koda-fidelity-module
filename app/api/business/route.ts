import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, ValidationError } from "@/lib/api-utils"

export async function GET() {
  try {
    const business = await getBusinessFromSession()
    return NextResponse.json({ business })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const business = await getBusinessFromSession()
    const body = await request.json()

    if (body.name !== undefined && (!body.name || typeof body.name !== "string" || !body.name.trim())) {
      throw new ValidationError("El nombre del negocio es obligatorio")
    }

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        ...(body.name?.trim() && { name: body.name.trim() }),
        ...(body.brandColor !== undefined && { brandColor: body.brandColor }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
      },
    })

    return NextResponse.json({ business: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
