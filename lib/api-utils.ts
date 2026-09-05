import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import type { Role } from "@prisma/client"
import { randomUUID } from "node:crypto"

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

export type ApiErrorCode =
  | "KF-AUTH-001" | "KF-ACCOUNT-001" | "KF-ACCESS-001" | "KF-CARD-001"
  | "KF-CARD-004" | "KF-CUSTOMER-001" | "KF-REQUEST-001" | "KF-SYS-001"

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status = 400,
    public readonly retryable = false,
    public readonly action = "Revisa la solicitud e inténtalo de nuevo.",
  ) {
    super(message)
    this.name = "AppError"
  }
}

export function requestIdFrom(request?: Request) {
  return randomUUID()
}

export function withRequestId(response: Response, requestId: string = randomUUID()) {
  response.headers.set("x-request-id", requestId)
  return response
}

export function withApiContext(
  handler: (requestId: string) => Promise<Response>,
) {
  return async () => {
    const requestId = randomUUID()
    try {
      return withRequestId(await handler(requestId), requestId)
    } catch (error) {
      return withRequestId(handleApiError(error, requestId), requestId)
    }
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
    timezone: string
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

export function handleApiError(error: unknown, requestId: string = randomUUID()) {
  if (error instanceof AppError) {
    return NextResponse.json({
      error: error.message,
      code: error.code,
      action: error.action,
      requestId,
      retryable: error.retryable,
    }, { status: error.status, headers: { "x-request-id": requestId } })
  }
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message, code: "KF-AUTH-001", action: "Inicia sesión de nuevo.", requestId, retryable: false }, { status: 401, headers: { "x-request-id": requestId } })
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message, code: "KF-ACCESS-001", action: "Solicita permisos a un administrador.", requestId, retryable: false }, { status: 403, headers: { "x-request-id": requestId } })
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message, code: "KF-CUSTOMER-001", action: "Verifica el identificador solicitado.", requestId, retryable: false }, { status: 404, headers: { "x-request-id": requestId } })
  }
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message, code: "KF-REQUEST-001", action: "Corrige los datos enviados.", requestId, retryable: false }, { status: 400, headers: { "x-request-id": requestId } })
  }
  console.error("API Error", { requestId, errorName: error instanceof Error ? error.name : "UnknownError" })
  return NextResponse.json({ error: "Internal server error", code: "KF-SYS-001", action: "Inténtalo de nuevo más tarde.", requestId, retryable: true }, { status: 500, headers: { "x-request-id": requestId } })
}
