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
    passwordSetupRequired: boolean
  }
}

export async function getBusinessFromSession(): Promise<SessionBusiness> {
  const supabase = await createClient()
  const { data: { user: authUser }, error } = await supabase.auth.getUser()

  if (error || !authUser) {
    throw new UnauthorizedError()
  }

  const userRecord = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
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
      passwordSetupRequired: userRecord.passwordSetupRequired,
    },
  }
}

export const getAccountPrincipal = async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new UnauthorizedError()
  return user
}

export const requireBusinessPrincipal = getBusinessFromSession

export async function requireReadyBusinessPrincipal() {
  const principal = await getBusinessFromSession()
  if (principal.user.passwordSetupRequired) throw new ForbiddenError("Password setup required")
  return principal
}

export function safeNextPath(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback
  return value
}

export function requireRole(user: Pick<SessionBusiness["user"], "role">, ...allowed: Role[]) {
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
