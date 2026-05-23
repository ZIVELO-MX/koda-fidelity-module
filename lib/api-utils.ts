import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export class UnauthorizedError extends Error {
  constructor() {
    super("No autorizado")
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

export async function getBusinessFromSession() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user?.email) {
    throw new UnauthorizedError()
  }

  const business = await prisma.business.findUnique({
    where: { email: user.email },
  })

  if (!business) {
    throw new NotFoundError("Negocio no encontrado")
  }

  return business
}

export function handleApiError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  console.error("API Error:", error)
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
}
