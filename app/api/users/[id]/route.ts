import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createAdminClient } from "@/lib/supabase-admin"
import {
  getBusinessFromSession,
  handleApiError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  requireRole,
} from "@/lib/api-utils"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { business, user } = await getBusinessFromSession()
    requireRole(user, "admin")
    const { id } = await params

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || target.businessId !== business.id) {
      throw new NotFoundError("User not found")
    }

    const body = await request.json()
    const { role } = body

    if (role !== "admin" && role !== "sellador") {
      throw new ValidationError("Role must be 'admin' or 'sellador'")
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { business, user } = await getBusinessFromSession()
    requireRole(user, "admin")
    const { id } = await params

    if (user.id === id) {
      throw new ForbiddenError("You cannot remove yourself from the team")
    }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || target.businessId !== business.id) {
      throw new NotFoundError("User not found")
    }

    await prisma.user.delete({ where: { id } })

    const supabase = createAdminClient()
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const authUser = users.find((u) => u.email === target.email)
    if (authUser) {
      await supabase.auth.admin.deleteUser(authUser.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
