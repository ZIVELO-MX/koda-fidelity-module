import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cuerpoJson, ForbiddenError, getBusinessFromSession, handleApiError, NotFoundError, requestIdFrom, requireRole, requireWritableBusinessPrincipal, ValidationError, withRequestId } from "@/lib/api-utils"

/**
 * @openapi
 * /api/users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a business user
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: User updated } }
 *   delete:
 *     tags: [Users]
 *     summary: Remove a business user
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: User removed } }
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

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || target.businessId !== business.id) {
      throw new NotFoundError("User not found")
    }

    const body = await cuerpoJson(request)
    const { role } = body

    if (role !== "admin" && role !== "sellador") {
      throw new ValidationError("Role must be 'admin' or 'sellador'")
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
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

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || target.businessId !== business.id) {
      throw new NotFoundError("User not found")
    }

    // Las solicitudes de activación y las invitaciones se borran en cascada con
    // quien las hizo. Pasan a quien borra, para no perder el folio que soporte
    // puede estar atendiendo.
    await prisma.$transaction(async (tx) => {
      await tx.subscriptionRequest.updateMany({ where: { requestedByUserId: id }, data: { requestedByUserId: user.id } })
      await tx.teamInvitation.updateMany({ where: { invitedById: id }, data: { invitedById: user.id } })
      await tx.user.delete({ where: { id } })
    })

    return withRequestId(NextResponse.json({ success: true }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}
