import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { cuerpoJson, ConflictError, ForbiddenError, getBusinessFromSession, handleApiError, NotFoundError, requestIdFrom, requireRole, requireWritableBusinessPrincipal, ValidationError, withRequestId } from "@/lib/api-utils"

async function lockAdminMutation(tx: Prisma.TransactionClient, businessId: string, actorId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`business-admins:${businessId}`}))`
  const actor = await tx.user.findUnique({
    where: { id: actorId },
    select: { businessId: true, role: true },
  })
  if (!actor) throw new ConflictError("Tu acceso al equipo cambió. Recarga el equipo e inténtalo de nuevo")
  if (actor.businessId !== businessId) throw new ForbiddenError()
  if (actor.role !== "admin") throw new ConflictError("Tu rol cambió. Recarga el equipo e inténtalo de nuevo")
}

async function assertAnotherAdminRemains(tx: Prisma.TransactionClient, businessId: string) {
  const admins = await tx.user.count({ where: { businessId, role: "admin" } })
  if (admins <= 1) throw new ConflictError("El negocio debe conservar al menos un administrador")
}

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update a business user
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: User updated }
 *       409: { description: The business must retain an administrator }
 *   delete:
 *     tags: [Users]
 *     summary: Remove a business user
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: User removed }
 *       409: { description: The business must retain an administrator }
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = requestIdFrom(request)
  try {
    const { business, user } = await requireWritableBusinessPrincipal()
    requireRole(user, "admin")
    const { id } = await params

    if (user.id === id) {
      throw new ForbiddenError("You cannot change your own role")
    }

    const body = await cuerpoJson(request)
    const { role } = body

    if (role !== "admin" && role !== "sellador") {
      throw new ValidationError("Role must be 'admin' or 'sellador'")
    }

    const updated = await prisma.$transaction(async (tx) => {
      await lockAdminMutation(tx, business.id, user.id)
      const target = await tx.user.findUnique({ where: { id } })
      if (!target || target.businessId !== business.id) {
        throw new NotFoundError("User not found")
      }
      if (target.role === "admin" && role === "sellador") {
        await assertAnotherAdminRemains(tx, business.id)
      }
      return tx.user.update({
        where: { id },
        data: { role },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      })
    })

    return withRequestId(NextResponse.json({ user: updated }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = requestIdFrom(_request)
  try {
    const { business, user } = await requireWritableBusinessPrincipal()
    requireRole(user, "admin")
    const { id } = await params

    if (user.id === id) {
      throw new ForbiddenError("You cannot remove yourself from the team")
    }

    await prisma.$transaction(async (tx) => {
      await lockAdminMutation(tx, business.id, user.id)
      const target = await tx.user.findUnique({ where: { id } })
      if (!target || target.businessId !== business.id) {
        throw new NotFoundError("User not found")
      }
      if (target.role === "admin") await assertAnotherAdminRemains(tx, business.id)

      // Las solicitudes de activación y las invitaciones se borran en cascada con
      // quien las hizo. Pasan a quien borra, para no perder el folio que soporte
      // puede estar atendiendo.
      await tx.subscriptionRequest.updateMany({ where: { requestedByUserId: id }, data: { requestedByUserId: user.id } })
      await tx.teamInvitation.updateMany({ where: { invitedById: id }, data: { invitedById: user.id } })
      await tx.user.delete({ where: { id } })
    })

    return withRequestId(NextResponse.json({ success: true }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}
