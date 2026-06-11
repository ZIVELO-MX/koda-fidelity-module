import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import type { Role } from "@prisma/client"

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized")
    this.name = "UnauthorizedError"
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NotFoundError"
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message)
    this.name = "ForbiddenError"
  }
}

export type SessionBusiness = {
  business: {
    id: string
    name: string
    brandColor: string
    logoUrl: string | null
    iconName: string | null
    email: string
    nickname: string | null
    businessType: string | null
    address: string | null
    phone: string | null
    website: string | null
    instagram: string | null
    createdAt: Date
    updatedAt: Date
  }
  user: {
    id: string
    email: string
    name: string
    role: Role
  }
}

export async function getBusinessFromSession(): Promise<SessionBusiness> {
  const supabase = await createClient()
  const { data: { user: authUser }, error } = await supabase.auth.getUser()

  if (error || !authUser?.email) {
    throw new UnauthorizedError()
  }

  const userRecord = await prisma.user.findUnique({
    where: { email: authUser.email },
    include: { business: true },
  })

  if (!userRecord) {
    throw new NotFoundError("User not found")
  }

  return {
    business: userRecord.business,
    user: {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      role: userRecord.role,
    },
  }
}

export function requireRole(user: SessionBusiness["user"], ...allowed: Role[]) {
  if (!allowed.includes(user.role)) {
    throw new ForbiddenError(`Role ${user.role} is not allowed to perform this action`)
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  console.error("API Error:", error)
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}
