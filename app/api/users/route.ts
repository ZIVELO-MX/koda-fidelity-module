import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createAdminClient } from "@/lib/supabase-admin"
import { getBusinessFromSession, handleApiError, ValidationError, requireRole } from "@/lib/api-utils"

const DEFAULT_PASSWORD = "Koda1234!"

export async function GET() {
  try {
    const { business, user } = await getBusinessFromSession()
    requireRole(user, "admin")

    const users = await prisma.user.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { business, user } = await getBusinessFromSession()
    requireRole(user, "admin")

    const body = await request.json()
    const { email, name, role } = body

    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new ValidationError("Valid email is required")
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new ValidationError("Name is required")
    }
    if (role !== "admin" && role !== "sellador") {
      throw new ValidationError("Role must be 'admin' or 'sellador'")
    }

    const memberLimit = parseInt(process.env.TEAM_MEMBER_LIMIT ?? "3", 10)
    const memberCount = await prisma.user.count({ where: { businessId: business.id } })
    if (memberCount >= memberLimit) {
      throw new ValidationError(`Team member limit of ${memberLimit} reached`)
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ValidationError("A user with that email already exists")
    }

    const supabase = createAdminClient()
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { name, must_change_password: true },
    })

    if (authError) {
      if (authError.message.includes("already been registered")) {
        throw new ValidationError("A user with that email already exists in auth")
      }
      throw new Error(authError.message)
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        name: name.trim(),
        role,
        businessId: business.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      { user: newUser, authUserId: authData.user.id, temporaryPassword: DEFAULT_PASSWORD },
      { status: 201 },
    )
  } catch (error) {
    return handleApiError(error)
  }
}
