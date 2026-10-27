import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cuerpoJson, getBusinessFromSession, handleApiError, requestIdFrom, requireRole, requireWritableBusinessPrincipal, ValidationError, withRequestId } from "@/lib/api-utils"
import { withBusinessAvatarUrl } from "@/lib/private-avatar"

const noStore = { headers: { "Cache-Control": "private, no-store" } }
const COLOR = /^#[0-9a-f]{6}$/i
// El panel manda el logo como data URL de cualquier `image/*`, y lo reenvía en
// cada guardado: una lista cerrada de tipos dejaría sin poder guardar a quien ya
// subió, por ejemplo, un AVIF. ponytail: viaja en cada respuesta que incluye el
// negocio; pasarlo a storage cuando el peso se note.
const LOGO = /^(data:image\/[a-z0-9.+-]+;base64,|https:\/\/)/i
const MAX_LOGO = 2_900_000 // 2 MB en base64, con margen para la cabecera

/**
 * @openapi
 * /api/business:
 *   get:
 *     tags:
 *       - Business
 *     summary: Get business profile
 *     description: Returns the authenticated business profile. Requires an active session.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Business profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 business:
 *                   $ref: '#/components/schemas/Business'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     tags:
 *       - Business
 *     summary: Update business profile
 *     description: Updates the authenticated business data.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Business name
 *               brandColor:
 *                 type: string
 *                 description: Brand color in hexadecimal format
 *                 example: "#ff6b35"
 *               logoUrl:
 *                 type: string
 *                 description: Logo URL
 *     responses:
 *       200:
 *         description: Updated business
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 business:
 *                   $ref: '#/components/schemas/Business'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const { business } = await getBusinessFromSession()
    return withRequestId(NextResponse.json({ business: await withBusinessAvatarUrl(prisma, business) }, noStore), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}

export async function PUT(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const { business, user } = await requireWritableBusinessPrincipal()
    requireRole(user, "admin")
    const body = await cuerpoJson(request)

    if (body.name !== undefined && (!body.name || typeof body.name !== "string" || !body.name.trim())) {
      throw new ValidationError("Business name is required")
    }
    // El color y el logo se pintan en la tarjeta pública. Antes se guardaba
    // cualquier texto: el campo del color es libre y el límite de 2 MB del logo
    // solo existía en el navegador. Solo se valida lo que cambia: el panel
    // reenvía lo guardado, y un valor viejo no debe impedir guardar lo demás.
    const cambia = (campo: "brandColor" | "logoUrl") => body[campo] !== undefined && body[campo] !== business[campo]
    if (cambia("brandColor") && (typeof body.brandColor !== "string" || !COLOR.test(body.brandColor))) {
      throw new ValidationError("El color debe ser hexadecimal, como #ff6b35")
    }
    if (cambia("logoUrl") && body.logoUrl !== null && body.logoUrl !== "" && (typeof body.logoUrl !== "string" || !LOGO.test(body.logoUrl) || body.logoUrl.length > MAX_LOGO)) {
      throw new ValidationError("El logo debe ser una imagen de hasta 2 MB")
    }
    for (const campo of ["nickname", "businessType", "address", "phone", "website", "instagram", "iconName", "stampIconName"]) {
      if (body[campo] !== undefined && body[campo] !== null && typeof body[campo] !== "string") throw new ValidationError(`${campo} debe ser texto`)
    }

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        ...(body.name?.trim() && { name: body.name.trim() }),
        ...(body.brandColor !== undefined && { brandColor: body.brandColor }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.nickname !== undefined && { nickname: body.nickname?.trim() || null }),
        ...(body.businessType !== undefined && { businessType: body.businessType || null }),
        ...(body.address !== undefined && { address: body.address || null }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.website !== undefined && { website: body.website || null }),
        ...(body.instagram !== undefined && { instagram: body.instagram || null }),
        ...(body.iconName !== undefined && { iconName: body.iconName || null }),
        ...(body.stampIconName !== undefined && { stampIconName: body.stampIconName || null }),
      },
    })

    return withRequestId(NextResponse.json({ business: await withBusinessAvatarUrl(prisma, updated) }, noStore), requestId)
  } catch (error) {
    return withRequestId(handleApiError(error, requestId), requestId)
  }
}
