import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { normalizeEmail } from "@/lib/auth-security"
import { prisma } from "@/lib/prisma"
import { requireWritableBusinessPrincipal, cuerpoJson, handleApiError, ConflictError, NotFoundError, ValidationError, requireRole, requestIdFrom, withRequestId } from "@/lib/api-utils"

/**
 * @openapi
 * /api/customers/{id}:
 *   delete:
 *     tags:
 *       - Customers
 *     summary: Deactivate customer
 *     description: Soft-deletes a customer by setting isActive to false. Only accessible by the business that owns the card.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer deactivated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = requestIdFrom(request)
  try {
    const { business, user } = await requireWritableBusinessPrincipal()
    requireRole(user, "admin")
    const { id } = await params

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { card: { select: { businessId: true } } },
    })

    if (!customer || customer.card.businessId !== business.id) {
      throw new NotFoundError("Customer not found")
    }

    if (new URL(request.url).searchParams.get("permanent") === "true") {
      throw new ValidationError("El borrado permanente de clientes no está disponible")
    }
    await prisma.customer.update({ where: { id }, data: { isActive: false } })

    return withRequestId(NextResponse.json({ success: true }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}

const correctionSchema = z.object({ email: z.string().trim().max(254).email() })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = requestIdFrom(request)
  try {
    const { business, user } = await requireWritableBusinessPrincipal()
    requireRole(user, "admin")
    const { id } = await params
    const parsed = correctionSchema.safeParse(await cuerpoJson(request))
    if (!parsed.success) throw new ValidationError("Ingresa un correo electrónico válido")
    const email = normalizeEmail(parsed.data.email)

    await prisma.$transaction(async (tx) => {
      const membership = await tx.customer.findFirst({
        where: { id, card: { businessId: business.id } },
        select: { cardId: true, email: true },
      })
      if (!membership) throw new NotFoundError("Cliente no encontrado")
      if (membership.email === email) return

      // Comparte el candado de inscripción para evitar crear dos membresías
      // cuando se corrige el correo a la vez que alguien se inscribe.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`join:${membership.cardId}:${email}`}))`
      const candidates = await tx.customer.findMany({
        where: { id: { not: id }, cardId: membership.cardId, email: { equals: email, mode: "insensitive" } },
        select: { email: true },
      })
      if (candidates.some(candidate => normalizeEmail(candidate.email ?? "") === email)) {
        throw new ConflictError("Ese correo ya tiene una membresía en esta tarjeta")
      }

      const result = await tx.customer.updateMany({
        where: { id, email: membership.email, card: { businessId: business.id } },
        data: {
          email,
          ...(normalizeEmail(membership.email ?? "") !== email && { profileId: null, portalHiddenAt: null }),
        },
      })
      if (result.count !== 1) throw new ConflictError("El correo cambió. Recarga e inténtalo de nuevo.")
    })

    return withRequestId(NextResponse.json({ success: true }), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}
